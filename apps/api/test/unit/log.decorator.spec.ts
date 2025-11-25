// tests/unit/log.decorator.spec.ts
import 'reflect-metadata';
import { Log } from '../../src/common/decorators/log.decorator';

describe('@Log() Decorator', () => {
  let loggerMock: jest.Mocked<any>;

  beforeEach(() => {
    loggerMock = {
      infoLog: jest.fn(),
      errorLog: jest.fn(),
    };
  });

  class TestService {
    public logger = loggerMock;

    @Log('Testing log decorator')
    async successMethod(name: string) {
      return `Hello ${name}`;
    }

    @Log()
    failMethod() {
      throw new Error('Boom!');
    }
  }

  it('should log entry and success with custom message', async () => {
    const service = new TestService();
    await service.successMethod('Ali');

    expect(loggerMock.infoLog).toHaveBeenCalledWith(
      'Testing log decorator',
      expect.objectContaining({
        context: 'TestService',
        args: ['Ali'],
        requestId: 'N/A',
      }),
    );

    expect(loggerMock.infoLog).toHaveBeenCalledWith(
      'successMethod succeeded',
      expect.objectContaining({
        context: 'TestService',
        result: 'Hello Ali',
        durationMs: expect.any(Number),
      }),
    );
  });

  it('should log entry and error on failure', async () => {
    const service = new TestService();

    await expect(service.failMethod()).rejects.toThrow('Boom!');

    expect(loggerMock.infoLog).toHaveBeenCalledWith(
      'failMethod called',
      expect.objectContaining({
        context: 'TestService',
        args: [],
      }),
    );

    expect(loggerMock.errorLog).toHaveBeenCalledWith(
      'failMethod failed',
      expect.objectContaining({
        context: 'TestService',
        error: expect.any(Error),
        durationMs: expect.any(Number),
      }),
    );

    const errorCall = loggerMock.errorLog.mock.calls[0][1];
    expect(errorCall.error.message).toBe('Boom!');
    expect(errorCall.error.stack).toContain('Boom!');
  });

  it('should mask password in args', async () => {
    class AuthService {
      public logger = loggerMock;

      @Log('Login attempt')
      login(credentials: { email: string; password: string }) {
        return credentials;
      }
    }

    const service = new AuthService();
    service.login({ email: 'a@b.com', password: 'secret123' });

    expect(loggerMock.infoLog).toHaveBeenCalledWith(
      'Login attempt',
      expect.objectContaining({
        context: 'AuthService',
        args: [{ email: 'a@b.com', password: '***' }],
      }),
    );
  });
});