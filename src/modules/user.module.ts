import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService } from 'src/app/service/auth.service';
import { UserService, USER_REPOSITORY } from 'src/app/service/user.service';
import { JwtStrategy } from 'src/infra/auth/jwt.strategy';
import { PrismaService } from 'src/infra/persistence/prisma.service';
import { PrismaUserRepository } from 'src/infra/persistence/repos/user.repository';
import { AuthController } from 'src/presentation/controllers/auth.controller';
import { UserController } from 'src/presentation/controllers/user.controller';

@Module({
  imports: [
    JwtModule.registerAsync({
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '60m' },
      }),
      inject: [ConfigService],
      imports: [ConfigModule],
    }),
  ],
  controllers: [AuthController, UserController],
  providers: [
    UserService,
    AuthService,
    PrismaService,
    JwtStrategy,
    
    {
      provide: USER_REPOSITORY,
      useClass: PrismaUserRepository,
    },
  ],
  exports: [USER_REPOSITORY, UserService],
})
export class UserModule {}