import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class RefreshTokenDto {
  @ApiProperty({ example: 'string', description: 'Refresh token' })
  @IsString()
  refreshToken: string;
}