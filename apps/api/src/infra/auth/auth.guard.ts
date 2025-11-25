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
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('No token provided');
    }

    const [_, token] = request.headers.authorization?.split(' ') ?? [];

    const userId = Number(token.split(':')[0]);

    if (isNaN(userId)) {
      throw new UnauthorizedException('Invalid token format');
    }

    const storedToken = await this.redisService.getAccessToken(userId);

    if (!storedToken || storedToken !== token) {
      throw new UnauthorizedException('Invalid or expired token');
    }

    const user = await this.userRepository.findOne(userId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    request.user = { sub: user.id, email: user.email };
    return true;
  }
}