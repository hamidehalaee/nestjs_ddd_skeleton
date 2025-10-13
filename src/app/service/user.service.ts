import { Inject, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { User } from 'src/domain/user/user.entity';
import * as argon2 from 'argon2';
import { UserRepository } from 'src/domain/user/userRepository.interface';
import { CreateUserDto } from '../dto/createUser.dto';
import { UpdateUserDto } from '../dto/updateUser.dto';

export const USER_REPOSITORY = Symbol('USER_REPOSITORY');

@Injectable()
export class UserService {
  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepository: UserRepository,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<{ user: User; access_token: string; refresh_token: string }> {
    const hashedPassword = await argon2.hash(createUserDto.password);
    const payload = { sub: 0, email: createUserDto.email }; // Temporary sub, updated after user creation
    const accessToken = this.jwtService.sign(payload, { expiresIn: '60m' });
    const refreshToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      expiresIn: '7d',
    });

    const user = await this.userRepository.create({
      ...createUserDto,
      password: hashedPassword,
      refreshToken,
    });

    // Update payload with actual user ID
    const finalPayload = { sub: user.id, email: user.email };
    const finalAccessToken = this.jwtService.sign(finalPayload, { expiresIn: '60m' });
    const finalRefreshToken = this.jwtService.sign(finalPayload, {
      secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      expiresIn: '7d',
    });

    await this.userRepository.update(user.id, { refreshToken: finalRefreshToken });

    return {
      user,
      access_token: finalAccessToken,
      refresh_token: finalRefreshToken,
    };
  }

  async findAll(): Promise<User[]> {
    return this.userRepository.findAll();
  }

  async findOne(id: number): Promise<User | null> {
    return this.userRepository.findOne(id);
  }

  async update(id: number, updateUserDto: Partial<UpdateUserDto & { refreshToken?: string }>): Promise<User> {
    if (updateUserDto.password) {
      updateUserDto.password = await argon2.hash(updateUserDto.password);
    }
    return this.userRepository.update(id, updateUserDto);
  }

  async remove(id: number): Promise<void> {
    return this.userRepository.remove(id);
  }
}