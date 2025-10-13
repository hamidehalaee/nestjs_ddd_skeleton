import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { ConfigService } from '@nestjs/config';
import { USER_REPOSITORY } from './user.service';
import { UserRepository } from 'src/domain/user/userRepository.interface';
import { LoginUserDto } from '../dto/loginUser.dto';
import { RefreshTokenDto } from '../dto/refreshToken.dto';

@Injectable()
export class AuthService {
  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepository: UserRepository,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
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

    const payload = { sub: user.id, email: user.email };
    const accessToken = this.jwtService.sign(payload, { expiresIn: '60m' });
    const refreshToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      expiresIn: '7d',
    });

    await this.userRepository.update(user.id, { refreshToken });

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
    };
  }

  async refresh(refreshTokenDto: RefreshTokenDto): Promise<{ access_token: string }> {
    const { refreshToken } = refreshTokenDto;
    try {
      const payload = await this.jwtService.verifyAsync(refreshToken, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      });
      const user = await this.userRepository.findOne(payload.sub);
      if (!user || user.refreshToken !== refreshToken) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      const newPayload = { sub: user.id, email: user.email };
      const accessToken = this.jwtService.sign(newPayload, { expiresIn: '60m' });

      return { access_token: accessToken };
    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }
}