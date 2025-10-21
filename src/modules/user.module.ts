import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthService } from 'src/app/service/auth.service';
import { UserService, USER_REPOSITORY } from 'src/app/service/user.service';
import { TokenAuthGuard } from 'src/infra/auth/auth.guard';
import { TokenService } from 'src/infra/auth/token.service';
import { PrismaService } from 'src/infra/persistence/prisma.service';
import { RedisService } from 'src/infra/persistence/redis.service';
import { PrismaUserRepository } from 'src/infra/persistence/repos/user.repository';
import { AuthController } from 'src/presentation/controllers/auth.controller';
import { UserController } from 'src/presentation/controllers/user.controller';

@Module({
  controllers: [UserController, AuthController],
  providers: [
    UserService,
    AuthService,
    PrismaService,
    RedisService,
    TokenService,
    TokenAuthGuard,
    ConfigService,
    {
      provide: USER_REPOSITORY,
      useClass: PrismaUserRepository,
    },
  ],
  exports: [USER_REPOSITORY, UserService],
})
export class UserModule {}