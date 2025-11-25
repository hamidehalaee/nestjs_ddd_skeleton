import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { UserRepository } from 'src/domain/user/user-repository.interface';
import * as argon2 from 'argon2';
import { USER_REPOSITORY } from './user.service';
import { RedisService } from 'src/infra/persistence/redis.service';
import { LoginUserDto } from '../dto/login-user.dto';
import { RefreshTokenDto } from '../dto/refresh-token.dto';
import { v4 as uuidv4 } from 'uuid';
import { randomBytes } from 'crypto';

@Injectable()
export class AuthService {
  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepository: UserRepository,
    private readonly redisService: RedisService,
  ) {}

  async login(
    loginUserDto: LoginUserDto,
    deviceInfo: { userAgent: string; ip: string },
  ): Promise<{
    user: { id: number; email: string; name: string; };
    access_token: string;
    refresh_token: string;
    session_id: string;
  }> {
    const user = await this.userRepository.findOneByEmail(loginUserDto.email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await argon2.verify(user.password, loginUserDto.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const sessionId = uuidv4();

    const accessTokenPart = this.generateAccessToken();  
    const refreshTokenPart = this.generateRefreshToken();

    const access_token = `${user.id}:${accessTokenPart}`;
    const refresh_token = `${user.id}:${refreshTokenPart}`;

    await this.redisService.setAccessToken(user.id, access_token);
    await this.redisService.setRefreshToken(user.id, refresh_token);

    await this.redisService.setSession(
      user.id,
      sessionId,
      refresh_token,
      deviceInfo,
      new Date().toISOString(),
    );

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name ?? '',
      },
      access_token,     
      refresh_token,    
      session_id: sessionId,
    };
  }

  async refresh(refreshTokenDto: RefreshTokenDto): Promise<{
    access_token: string;
    refresh_token: string;
  }> {
    {
    const { refreshToken } = refreshTokenDto;

    const parts = refreshToken.split(':');
    if (parts.length !== 2) {
      throw new UnauthorizedException('Invalid refresh token format');
    }

    const userId = Number(parts[0]);
    if (isNaN(userId)) {
      throw new UnauthorizedException('Invalid user id in token');
    }

    const storedRefreshToken = await this.redisService.getRefreshToken(userId);
    if (!storedRefreshToken || storedRefreshToken !== refreshToken) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const user = await this.userRepository.findOne(userId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const sessionId = await this.redisService.findSessionByToken(user.id, refreshToken);
    if (!sessionId) {
      throw new UnauthorizedException('Session not found');
    }

    const newAccessTokenPart = this.generateAccessToken();
    const newAccessToken = `${user.id}:${newAccessTokenPart}`;

    await this.redisService.setAccessToken(user.id, newAccessToken);

    return {
      access_token: newAccessToken,
      refresh_token: storedRefreshToken,
    };
  }
  }

  async terminateSession(token: string, sessionId: string): Promise<void> {
    const userId = Number(token.split(':')[0]);
    if (isNaN(userId)) return;
    await this.redisService.deleteSession(userId, sessionId);
  }

  private generateAccessToken(): string {
    return randomBytes(32).toString('hex'); // 64 chars
  }

  private generateRefreshToken(): string {
    return randomBytes(48).toString('hex'); // 96 chars
  }
}