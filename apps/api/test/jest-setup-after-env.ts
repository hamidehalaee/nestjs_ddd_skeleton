// apps/api/test/jest-setup-after-env.ts
import supertest from 'supertest';

export const e2e = supertest((global.__E2E_APP__ as any).getHttpServer());
export const prisma = global.__E2E_PRISMA__!;
export const receivedLogs = global.__E2E_RECEIVED_LOGS__!;

beforeEach(() => {
  receivedLogs.length = 0;
});

afterAll(async () => {
  await global.__E2E_APP__?.close();
  await global.__E2E_RABBIT_CHANNEL__?.close();
});