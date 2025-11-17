import { Injectable, CanActivate, ExecutionContext, UnauthorizedException, Inject } from '@nestjs/common';
import { USER_REPOSITORY } from 'src/app/service/user.service';
import { UserRepository } from 'src/domain/user/user-repository.interface';
import { RedisService } from '../persistence/redis.service';

@Injectable()
export class TokenAuthGuard implements CanActivate {
  constructor(
    private readonly redisService: RedisService,
    @Inject(USER_REPOSITORY) private readonly userRepository: UserRepository,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = request.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      throw new UnauthorizedException('No token provided');
    }

    const userId = Number(token.split(':')[0]);
    const storedToken = await this.redisService.getAccessToken(userId);

    if (!storedToken || storedToken !== token) {
      throw new UnauthorizedException('Invalid token');
    }

    const user = await this.userRepository.findOne(userId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    request.user = { sub: user.id, email: user.email };
    return true;
  }
}