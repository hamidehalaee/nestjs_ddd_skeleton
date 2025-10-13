import { Controller, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { LoginUserDto } from 'src/app/dto/loginUser.dto';
import { RefreshTokenDto } from 'src/app/dto/refreshToken.dto';
import { AuthService } from 'src/app/service/auth.service';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @ApiOperation({ summary: 'Log in a user and return JWT tokens' })
  @ApiBody({ type: LoginUserDto })
  @ApiResponse({ status: 200, description: 'Access and refresh tokens returned', type: Object })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  login(@Body() loginUserDto: LoginUserDto) {
    return this.authService.login(loginUserDto);
  }

  @Post('refresh')
  @ApiOperation({ summary: 'Refresh access token using refresh token' })
  @ApiBody({ type: RefreshTokenDto })
  @ApiResponse({ status: 200, description: 'New access token returned', type: Object })
  @ApiResponse({ status: 401, description: 'Invalid refresh token' })
  refresh(@Body() refreshTokenDto: RefreshTokenDto) {
    return this.authService.refresh(refreshTokenDto);
  }
}