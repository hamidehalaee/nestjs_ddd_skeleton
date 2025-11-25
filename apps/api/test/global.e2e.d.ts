// apps/api/test/global.e2e.d.ts
import { INestApplication } from '@nestjs/common';
import { PrismaService } from 'src/infra/persistence/prisma.service';
import * as amqplib from 'amqplib';

declare global {
  var __E2E_APP__: INestApplication<any> | undefined;
  var __E2E_PRISMA__: PrismaService | undefined;
  var __E2E_RABBIT_CHANNEL__: amqplib.Channel | undefined;
  var __E2E_RECEIVED_LOGS__: any[] | undefined;

  namespace NodeJS {
    interface Global {
      __E2E_APP__: INestApplication<any> | undefined;
      __E2E_PRISMA__: PrismaService | undefined;
      __E2E_RABBIT_CHANNEL__: amqplib.Channel | undefined;
      __E2E_RECEIVED_LOGS__: any[] | undefined;
    }
  }
}

export {};