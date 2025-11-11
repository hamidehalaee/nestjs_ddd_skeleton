import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as winston from 'winston';
import * as Transport from 'winston-transport';
import * as amqplib from 'amqplib';

interface RabbitMQTransportOptions {
  url: string;
  exchange: string;
}

interface LogMeta {
  context?: string;
  args?: any;
  result?: any;
  durationMs?: number;
  requestId?: string;
  ip?: string;
  userAgent?: string;
  error?: string;
  stack?: string;
}

class RabbitMQTransport extends Transport {
  private channel?: amqplib.Channel;

  constructor(private opts: RabbitMQTransportOptions) {
    super();
  }

  async log(info: any, callback: () => void) {
    try {
      if (!this.channel) {
        const conn = await amqplib.connect(this.opts.url);
        this.channel = await conn.createChannel();
        await this.channel.assertExchange(this.opts.exchange, 'fanout', { durable: false });
      }
      this.channel.publish(this.opts.exchange, '', Buffer.from(JSON.stringify(info)));
      callback();
    } catch (err) {
      console.error('RabbitMQ log failed:', err);
      callback();
    }
  }
}

@Injectable()
export class LoggerService {
  private readonly logger: winston.Logger;

  constructor(private configService: ConfigService) {
    const rabbitUrl = this.configService.get<string>('RABBITMQ_URL')!;

    const rabbitTransport = new RabbitMQTransport({
      url: rabbitUrl,
      exchange: 'app-logs',
    });

    // ──────────────────────────────────────────────────────────────
    // Console transport: pretty + colors
    const consoleTransport = new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.timestamp(),
        winston.format.printf(this.prettyPrint.bind(this)),
      ),
    });

    // ──────────────────────────────────────────────────────────────
    // RabbitMQ transport: clean JSON
    const rabbitMqTransport = rabbitTransport;
    rabbitMqTransport.format = winston.format.combine(
      winston.format.timestamp(),
      winston.format.errors({ stack: true }),
      winston.format.json(),
    );

    this.logger = winston.createLogger({
      level: 'info',
      transports: [consoleTransport, rabbitMqTransport],
    });
  }

  // ──────────────────────────────────────────────────────────────
  private prettyPrint(info: any) {
    const {
      level,
      message,
      timestamp,
      context,
      args,
      result,
      durationMs,
      requestId,
      ip,
      userAgent,
      error,
      stack,
    } = info;

    const time = timestamp.split('T')[1].replace('Z', '');
    const parts: string[] = [`${level}: ${time}`];

    if (context) parts.push(`[${context}]`);
    parts.push(message);

    if (args) {
      const argStr = JSON.stringify(args, null, 2)
        .split('\n')
        .map(l => '  ' + l)
        .join('\n');
      parts.push(`\nArgs:\n${argStr}`);
    }

    if (result !== undefined) {
      const resStr = JSON.stringify(result, null, 2)
        .split('\n')
        .map(l => '  ' + l)
        .join('\n');
      parts.push(`\nResult:\n${resStr}`);
    }

    if (durationMs) parts.push(`(${durationMs}ms)`);

    const reqInfo: string[] = [];
    if (requestId && requestId !== 'N/A') reqInfo.push(`req:${requestId}`);
    if (ip && ip !== 'unknown') reqInfo.push(`ip:${ip}`);
    if (userAgent && userAgent !== 'unknown') reqInfo.push(`ua:${userAgent.substring(0, 30)}...`);
    if (reqInfo.length) parts.push(`[${reqInfo.join(' ')}]`);

    if (error) parts.push(`\nError: ${error}`);
    if (stack) parts.push(`\n${stack}`);

    return parts.join(' ');
  }

  // ──────────────────────────────────────────────────────────────
  log(message: string, meta?: LogMeta) {
    this.logger.info(message, meta);
  }

  error(message: string, meta?: LogMeta) {
    this.logger.error(message, meta);
  }

  warn(message: string, meta?: LogMeta) {
    this.logger.warn(message, meta);
  }

  debug(message: string, meta?: LogMeta) {
    this.logger.debug(message, meta);
  }
}