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
  
  async setSession(userId: number, sessionId: string, refreshToken: string, deviceInfo: { userAgent: string; ip: string }, lastActive: string): Promise<void> {
    const sessionData = JSON.stringify({
      refreshToken,
      device: deviceInfo,
      lastActive,
    });
    await this.client.hSet(`user_sessions:${userId}`, sessionId, sessionData);
    await this.client.expire(`user_sessions:${userId}`, 7 * 24 * 60 * 60); // 7 days TTL
  }

  async getSessions(userId: number): Promise<{ sessionId: string; refreshToken: string; device: { userAgent: string; ip: string }; lastActive: string }[]> {
    const sessions = await this.client.hGetAll(`user_sessions:${userId}`) as Record<string, string>;
    return Object.entries(sessions).map(([sessionId, data]) => {
      const parsed = JSON.parse(data);
      return {
        sessionId,
        refreshToken: parsed.refreshToken,
        device: parsed.device,
        lastActive: parsed.lastActive,
      };
    });
  }

  async getSessionToken(userId: number, sessionId: string): Promise<string | null> {
    const data = await this.client.hGet(`user_sessions:${userId}`, sessionId);
    return data ? JSON.parse(data).refreshToken : null;
  }

  async updateSession(userId: number, sessionId: string, refreshToken: string, lastActive: string): Promise<void> {
    const existingData = await this.client.hGet(`user_sessions:${userId}`, sessionId);
    if (existingData) {
      const parsed = JSON.parse(existingData);
      const updatedData = JSON.stringify({
        ...parsed,
        refreshToken,
        lastActive,
      });
      await this.client.hSet(`user_sessions:${userId}`, sessionId, updatedData);
      await this.client.expire(`user_sessions:${userId}`, 7 * 24 * 60 * 60);
    }
  }

  async findSessionByToken(userId: number, refreshToken: string): Promise<string | null> {
    const sessions = await this.client.hGetAll(`user_sessions:${userId}`) as Record<string, string>;
    for (const [sessionId, data] of Object.entries(sessions)) {
      if (JSON.parse(data).refreshToken === refreshToken) {
        return sessionId;
      }
    }
    return null;
  }

  async deleteSession(userId: number, sessionId: string): Promise<void> {
    await this.client.hDel(`user_sessions:${userId}`, sessionId);
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