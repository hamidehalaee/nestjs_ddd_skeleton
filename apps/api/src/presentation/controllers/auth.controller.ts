import { Controller, Post, Body, Req, Delete, Get, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { LoginUserDto } from 'src/app/dto/login-user.dto';
import { RefreshTokenDto } from 'src/app/dto/refresh-token.dto';
import { AuthService } from 'src/app/service/auth.service';
import { Request } from 'express';
import { TokenAuthGuard } from 'src/infra/auth/auth.guard';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @ApiOperation({ summary: 'Log in a user and return tokens' })
  @ApiBody({ type: LoginUserDto })
  @ApiResponse({ status: 200, description: 'Access and refresh tokens returned', type: Object })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  login(@Body() loginUserDto: LoginUserDto, @Req() request: Request) {
    const deviceInfo = { userAgent: request.headers['user-agent'] || 'unknown', ip: request.ip };
    return this.authService.login(loginUserDto, deviceInfo);
  }

  @Post('refresh')
  @ApiOperation({ summary: 'Refresh access token using refresh token' })
  @ApiBody({ type: RefreshTokenDto })
  @ApiResponse({ status: 200, description: 'New access token returned', type: Object })
  @ApiResponse({ status: 401, description: 'Invalid refresh token' })
  refresh(@Body() refreshTokenDto: RefreshTokenDto) {
    return this.authService.refresh(refreshTokenDto);
  }

  @Delete('sessions/:sessionId')
  @UseGuards(TokenAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Terminate a specific session' })
  @ApiParam({ name: 'sessionId', description: 'Session ID to terminate', type: String })
  @ApiResponse({ status: 200, description: 'Session terminated' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  terminateSession(@Param('sessionId') sessionId: string, @Req() request: Request) {
    const userId = request.headers.authorization;
    return this.authService.terminateSession(userId, sessionId);
  }
}