import { Injectable } from '@nestjs/common';
import { randomBytes } from 'crypto';

@Injectable()
export class TokenService {
  generateAccessToken(): string {
    return randomBytes(32).toString('hex'); // 64-character random string
  }

  generateRefreshToken(): string {
    return randomBytes(48).toString('hex'); // 96-character random string
  }
}