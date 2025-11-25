// tests/unit/logger.service.spec.ts
import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { LoggerService } from '../../src/infra/log/log.service';
import * as winston from 'winston';

jest.mock('amqplib', () => ({
  connect: jest.fn().mockResolvedValue({
    createChannel: jest.fn().mockResolvedValue({
      assertExchange: jest.fn().mockResolvedValue(true),
      publish: jest.fn(),
    }),
  }),
}));

describe('LoggerService (Unit)', () => {
  let loggerService: LoggerService;

    beforeEach(async () => {
    jest.clearAllMocks();

    // این خط مهم است!
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});

    // یا این:
    process.env.NODE_ENV = 'development';

    const module = await Test.createTestingModule({
        providers: [
        LoggerService,
        {
            provide: ConfigService,
            useValue: {
            get: jest.fn().mockImplementation((key: string) => {
                if (key === 'RABBITMQ_URL') return 'amqp://localhost:5672';
                return null;
            }),
            },
        },
        ],
    }).compile();

    loggerService = module.get<LoggerService>(LoggerService);
    });

  it('should be defined', () => {
    expect(loggerService).toBeDefined();
  });

  it('should log info with metadata', () => {
    const logSpy = jest.spyOn(loggerService as any, 'log');

    loggerService.infoLog('User created', {
      context: 'UserService',
      args: [{ email: 'test@test.com' }],
      durationMs: 123,
    });

    expect(logSpy).toHaveBeenCalledWith(
      'info',
      'User created',
      expect.objectContaining({
        context: 'UserService',
        args: [{ email: 'test@test.com' }],
        durationMs: 123,
      }),
    );
  });

it('should log error with stack', () => {
  const logSpy = jest.spyOn(loggerService as any, 'log');
  const error = new Error('Database down');

  loggerService.errorLog('Failed to save', { context: 'UserService', error });

  expect(logSpy).toHaveBeenCalledWith(
    'error',
    'Failed to save',
    expect.objectContaining({
      context: 'UserService',
      error: expect.objectContaining({
        message: 'Database down',
        stack: expect.stringContaining('Error: Database down'),
      }),
    }),
  );
});

it('should use pretty format in console and mask sensitive data', () => {
  const consoleTransport = (loggerService as any).transports.find(
    (t: any) => t instanceof winston.transports.Console
  );

  const transportLogSpy = jest.spyOn(consoleTransport, 'log').mockImplementation();

  loggerService.infoLog('Test pretty print', {
    context: 'TestService',
    args: [{ password: 'secret', token: 'abc123' }],
    result: { id: 1 },
    durationMs: 50,
  });

  expect(transportLogSpy).toHaveBeenCalled();
  const loggedInfo = transportLogSpy.mock.calls[0][0];
  const output = loggedInfo[Symbol.for('message')]; // خروجی نهایی فرمت‌شده

  expect(output).toContain('TestService');
  expect(output).toContain('Test pretty print');
  expect(output).toContain('Args');
  expect(output).toContain('"password": "***"');
  expect(output).toContain('"token": "***"');
  expect(output).toContain('50ms');
  expect(output).toContain('"id": 1');
});

it('should mask sensitive fields like password, token and secret', () => {
  const consoleTransport = (loggerService as any).transports.find(
    (t: any) => t instanceof winston.transports.Console
  );
  const logSpy = jest.spyOn(consoleTransport, 'log').mockImplementation();

  loggerService.infoLog('Login attempt', {
    context: 'AuthService',
    args: [{
      email: 'a@b.com',
      password: 'mysecret123',
      token: 'abc123',
      secret: 'xyz',
      apiKey: '12345',
    }],
  });

  expect(logSpy).toHaveBeenCalled();
  const loggedInfo = logSpy.mock.calls[0][0];
  const output = loggedInfo[Symbol.for('message')];

  expect(output).toContain('AuthService');
  expect(output).toContain('Login attempt');
  expect(output).toContain('"password": "***"');
  expect(output).toContain('"token": "***"');
  expect(output).toContain('"secret": "***"');
  expect(output).toContain('"apiKey": "***"');
  expect(output).not.toContain('mysecret123');
  expect(output).not.toContain('abc123');
  expect(output).not.toContain('xyz');
});
});