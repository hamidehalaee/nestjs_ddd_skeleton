import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient } from 'redis';

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

  async setRefreshToken(userId: number, refreshToken: string): Promise<void> {
    await this.client.set(`refresh_token:${userId}`, refreshToken, { EX: 7 * 24 * 60 * 60 }); // 7 days expiry
  }

  async getRefreshToken(userId: number): Promise<string | null> {
    return this.client.get(`refresh_token:${userId}`);
  }

  async deleteRefreshToken(userId: number): Promise<void> {
    await this.client.del(`refresh_token:${userId}`);
  }
}