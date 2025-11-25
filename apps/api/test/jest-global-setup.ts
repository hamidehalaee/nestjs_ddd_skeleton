// apps/api/test/jest-global-setup.ts
require('ts-node').register({
  transpileOnly: true,
  require: ['tsconfig-paths/register'],
});

import { Test } from '@nestjs/testing';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from '../src/app.module';
import * as amqplib from 'amqplib';
import { PrismaService } from 'src/infra/persistence/prisma.service';

export default async function () {
  console.log('Global setup e2e: Start Running NestApplication...');

  const moduleFixture = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleFixture.createNestApplication();
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  await app.init();

  const prisma = app.get(PrismaService);

  const conn = await amqplib.connect(process.env.RABBITMQ_URL || 'amqp://localhost:5672');
  const channel = await conn.createChannel();
  await channel.assertExchange('app-logs', 'fanout', { durable: false });
  const q = await channel.assertQueue('', { exclusive: true });
  await channel.bindQueue(q.queue, 'app-logs', '');

  const receivedLogs: any[] = [];

  channel.consume(
    q.queue,
    (msg) => {
      if (msg) {
        const log = JSON.parse(msg.content.toString());
        receivedLogs.push(log);
        channel.ack(msg);
      }
    },
    { noAck: false },
  );

  global.__E2E_APP__ = app;
  global.__E2E_PRISMA__ = prisma;
  global.__E2E_RABBIT_CHANNEL__ = channel;
  global.__E2E_RECEIVED_LOGS__ = receivedLogs;

  console.log('Global setup e2e: complete.');
}