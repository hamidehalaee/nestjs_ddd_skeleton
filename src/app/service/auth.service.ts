import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { UserRepository } from 'src/domain/user/user-repository.interface';
import * as argon2 from 'argon2';
import { USER_REPOSITORY } from './user.service';
import { TokenService } from 'src/infra/auth/token.service';
import { RedisService } from 'src/infra/persistence/redis.service';
import { LoginUserDto } from '../dto/login-user.dto';
import { RefreshTokenDto } from '../dto/refresh-token.dto';

@Injectable()
export class AuthService {
  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepository: UserRepository,
    private readonly tokenService: TokenService,
    private readonly redisService: RedisService,
  ) {}

  async login(loginUserDto: LoginUserDto): Promise<{ access_token: string; refresh_token: string }> {
    const user = await this.userRepository.findOneByEmail(loginUserDto.email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await argon2.verify(user.password, loginUserDto.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const accessToken = this.tokenService.generateAccessToken();
    const refreshToken = this.tokenService.generateRefreshToken();

    await this.redisService.setAccessToken(user.id, `${user.id}:${accessToken}`);
    await this.redisService.setRefreshToken(user.id, `${user.id}:${refreshToken}`);

    return {
      access_token: `${user.id}:${accessToken}`,
      refresh_token: `${user.id}:${refreshToken}`,
    };
  }

  async refresh(refreshTokenDto: RefreshTokenDto): Promise<{ access_token: string }> {
    const { refreshToken } = refreshTokenDto;
    const userId = Number(refreshToken.split(':')[0]);
    const storedRefreshToken = await this.redisService.getRefreshToken(userId);

    if (!storedRefreshToken || storedRefreshToken !== refreshToken) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const user = await this.userRepository.findOne(userId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const accessToken = this.tokenService.generateAccessToken();
    await this.redisService.setAccessToken(user.id, `${user.id}:${accessToken}`);

    return { access_token: `${user.id}:${accessToken}` };
  }
}