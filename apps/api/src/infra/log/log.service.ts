// src/infra/log/log.service.ts

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as winston from 'winston';
import * as amqplib from 'amqplib';

import TransportStream = require('winston-transport');

interface RabbitMQTransportOptions {
  url: string;
  exchange: string;
}

class RabbitMQTransport extends TransportStream {
  name = 'rabbitmq';
  private channel?: amqplib.Channel;

  constructor(private opts: RabbitMQTransportOptions) {
    super();
  }

  async log(info: any, callback: () => void) {
    setImmediate(callback);

    try {
      if (!this.channel) {
        const conn = await amqplib.connect(this.opts.url);
        this.channel = await conn.createChannel();
        await this.channel.assertExchange(this.opts.exchange, 'fanout', { durable: false });
      }

      const buffer = Buffer.from(JSON.stringify(info));
      this.channel.publish(this.opts.exchange, '', buffer);
    } catch (err) {
      console.error('RabbitMQ log failed:', err);
    }
  }
}

function maskSensitive(obj: any): any {
  if (!obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(maskSensitive);

  const masked = { ...obj };
  for (const key in masked) {
    const lowerKey = key.toLowerCase();
    if (['password', 'token', 'secret', 'creditcard', 'ssn', 'apikey', 'privatekey'].includes(lowerKey)) {
      masked[key] = '***';
    } else if (typeof masked[key] === 'object' && masked[key] !== null) {
      masked[key] = maskSensitive(masked[key]);
    }
  }
  return masked;
}


function omitSensitive(obj: any): any {
  if (!obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(omitSensitive);

  const cleaned = { ...obj };
  for (const key in cleaned) {
    if (['password', 'token', 'secret', 'creditcard', 'ssn', 'apikey', 'privatekey'].some(s => key.toLowerCase().includes(s))) {
      delete cleaned[key];
    } else if (typeof cleaned[key] === 'object' && cleaned[key] !== null) {
      cleaned[key] = omitSensitive(cleaned[key]);
    }
  }
  return cleaned;
}

@Injectable()
export class LoggerService extends winston.Logger {
  constructor(configService: ConfigService) {
    const rabbitUrl = configService.get<string>('RABBITMQ_URL')!;

    const rabbitTransport = new RabbitMQTransport({
      url: rabbitUrl,
      exchange: 'app-logs',
    });

    const consoleTransport = new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.timestamp(),
        winston.format.printf(({ level, message, timestamp, context, ...meta }) => {
          const contextStr = context ? `[${context}] ` : '';
          const durationMs = meta.durationMs ? ` ${meta.durationMs}ms` : '';
          const args = meta.args ? { Args: maskSensitive(meta.args) } : {};
          const result = meta.result ? { Result: meta.result } : {};

          return `${timestamp} ${level}: ${contextStr}${message}${durationMs} ${JSON.stringify(
            { ...args, ...result, ...omitSensitive(meta) },
            null,
            2
          ).replace(/"password":\s*"[^"]*"/g, '"password": "***"')
            .replace(/"token":\s*"[^"]*"/g, '"token": "***"')}`;
        })
      ),
    });

    super({
      level: 'info',
      defaultMeta: { service: 'api' },
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
      transports: [consoleTransport, rabbitTransport],
    });
  }

  infoLog(message: string, meta?: Record<string, any>): void {
    this.log('info', message, meta);
  }

  errorLog(message: string, meta?: Record<string, any>): void {
    this.log('error', message, meta);
  }

  warnLog(message: string, meta?: Record<string, any>): void {
    this.log('warn', message, meta);
  }

  debugLog(message: string, meta?: Record<string, any>): void {
    this.log('debug', message, meta);
  }
}