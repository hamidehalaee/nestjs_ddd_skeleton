// tests/unit/user.service.spec.ts
import { Test } from '@nestjs/testing';
import { mock, MockProxy } from 'jest-mock-extended';
import { UserService, USER_REPOSITORY } from '../../src/app/service/user.service';
import { LoggerService } from '../../src/infra/log/log.service';
import { RedisService } from '../../src/infra/persistence/redis.service';

const mockUserRepository = {
  create: jest.fn(),
  findOne: jest.fn(),
  findAll: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
};

describe('UserService (Unit)', () => {
  let service: UserService;
  let loggerMock: MockProxy<LoggerService>;
  let redisMock: MockProxy<RedisService>;

  beforeEach(async () => {
    jest.clearAllMocks();

    loggerMock = mock<LoggerService>();
    redisMock = mock<RedisService>();

    const module = await Test.createTestingModule({
      providers: [
        UserService,
        { provide: USER_REPOSITORY, useValue: mockUserRepository },
        { provide: LoggerService, useValue: loggerMock },
        { provide: RedisService, useValue: redisMock },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should log entry with args and device info on create', async () => {
    const dto = { name: 'حمیده علایی', email: 'test@example.com', password: 'secret123' };
    const deviceInfo = { userAgent: 'iPhone', ip: '192.168.1.100' };

    mockUserRepository.create.mockResolvedValue({
      id: 1,
      uid: 'abc123',
      ...dto,
      password: 'hashed',
    });

    redisMock.setAccessToken.mockResolvedValue();
    redisMock.setRefreshToken.mockResolvedValue();
    redisMock.setSession.mockResolvedValue();
    redisMock.setUser.mockResolvedValue();

    await service.create(dto, deviceInfo);

    expect(loggerMock.infoLog).toHaveBeenCalledWith(
      'Creating user',
      expect.objectContaining({
        context: 'UserService',
        args: expect.arrayContaining([
          expect.objectContaining({
            name: 'حمیده علایی',
            email: 'test@example.com',
            password: '***',
          }),
          expect.objectContaining({
            userAgent: 'iPhone',
            ip: '192.168.1.100',
          }),
        ]),
      }),
    );

    expect(loggerMock.infoLog).toHaveBeenCalledWith(
      'create succeeded',
      expect.objectContaining({
        context: 'UserService',
        durationMs: expect.any(Number),
      }),
    );
  });
});