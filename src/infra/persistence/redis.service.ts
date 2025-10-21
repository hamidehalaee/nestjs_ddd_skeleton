import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient } from 'redis';
import { User } from 'src/domain/user/user.entity';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private client;

  constructor(private readonly configService: ConfigService) {
    this.client = createClient({
      url: this.configService.get<string>('REDIS_URL'),
    });
  }

  async onModuleInit() {
    await this.client.connect();
  }

  async onModuleDestroy() {
    await this.client.disconnect();
  }

  async setAccessToken(userId: number, accessToken: string): Promise<void> {
    await this.client.set(`access_token:${userId}`, accessToken, { EX: 60 * 60 }); // 1 hour
  }

  async getAccessToken(userId: number): Promise<string | null> {
    return this.client.get(`access_token:${userId}`);
  }

  async setRefreshToken(userId: number, refreshToken: string): Promise<void> {
    await this.client.set(`refresh_token:${userId}`, refreshToken, { EX: 7 * 24 * 60 * 60 }); // 7 days
  }

  async getRefreshToken(userId: number): Promise<string | null> {
    return this.client.get(`refresh_token:${userId}`);
  }

  async deleteTokens(userId: number): Promise<void> {
    await this.client.del(`access_token:${userId}`);
    await this.client.del(`refresh_token:${userId}`);
  }

  async setUser(user: User): Promise<void> {
    await this.client.set(`user:${user.id}`, JSON.stringify(user), { EX: 3600 }); // 1 hour
  }

  async getUser(userId: number): Promise<User | null> {
    const data = await this.client.get(`user:${userId}`);
    return data ? JSON.parse(data) : null;
  }

  async setAllUsers(users: User[]): Promise<void> {
    await this.client.set('users:all', JSON.stringify(users), { EX: 3600 }); // 1 hour
  }

  async getAllUsers(): Promise<User[] | null> {
    const data = await this.client.get('users:all');
    return data ? JSON.parse(data) : null;
  }

  async invalidateUserCache(userId: number): Promise<void> {
    await this.client.del(`user:${userId}`);
    await this.client.del('users:all');
  }
}