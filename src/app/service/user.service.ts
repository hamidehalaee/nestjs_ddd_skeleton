import { Inject, Injectable } from '@nestjs/common';
import { User } from 'src/domain/user/user.entity';
import { UserRepository } from 'src/domain/user/user-repository.interface';
import * as argon2 from 'argon2';
import { TokenService } from 'src/infra/auth/token.service';
import { RedisService } from 'src/infra/persistence/redis.service';
import { CreateUserDto } from '../dto/create-user.dto';
import { UpdateUserDto } from '../dto/update-user.dto';
import { v4 as uuidv4 } from 'uuid';

export const USER_REPOSITORY = Symbol('USER_REPOSITORY');

@Injectable()
export class UserService {
  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepository: UserRepository,
    private readonly tokenService: TokenService,
    private readonly redisService: RedisService,
  ) {}

  async create(createUserDto: CreateUserDto, deviceInfo: { userAgent: string; ip: string }): Promise<{ user: User; access_token: string; refresh_token: string, session_id: string }> {
    const hashedPassword = await argon2.hash(createUserDto.password);
    const user = await this.userRepository.create({
      ...createUserDto,
      password: hashedPassword,
    });

    const accessToken = this.tokenService.generateAccessToken();
    const refreshToken = this.tokenService.generateRefreshToken();

    await this.redisService.setAccessToken(user.id, `${user.id}:${accessToken}`);
    await this.redisService.setRefreshToken(user.id, `${user.id}:${refreshToken}`);
    
    const sessionId = uuidv4();

    await this.redisService.setSession(user.id, sessionId, refreshToken, deviceInfo, new Date().toISOString());
    await this.redisService.setUser(user);

    return {
      user,
      access_token: accessToken,
      refresh_token: refreshToken,
      session_id: sessionId,
    };
  }

  async findAll(): Promise<User[]> {
    const cachedUsers = await this.redisService.getAllUsers();
    if (cachedUsers) {
      return cachedUsers;
    }

    const users = await this.userRepository.findAll();
    await this.redisService.setAllUsers(users);
    return users;
  }

  async findOne(id: number): Promise<User | null> {
    const cachedUser = await this.redisService.getUser(id);
    if (cachedUser) {
      return cachedUser;
    }

    const user = await this.userRepository.findOne(id);
    if (user) {
      await this.redisService.setUser(user);
    }
    return user;
  }

  async update(id: number, updateUserDto: UpdateUserDto): Promise<User> {
    if (updateUserDto.password) {
      updateUserDto.password = await argon2.hash(updateUserDto.password);
    }
    const user = await this.userRepository.update(id, updateUserDto);
    await this.redisService.invalidateUserCache(id);
    await this.redisService.setUser(user);
    return user;
  }

  async remove(id: number): Promise<void> {
    // Delete all sessions for the user
    await this.redisService.deleteTokens(id);
    const sessions = await this.redisService.getSessions(id);
    for (const { sessionId } of sessions) {
      await this.redisService.deleteSession(id, sessionId);
    }
    await this.redisService.invalidateUserCache(id);
    await this.userRepository.remove(id);
  }
}

