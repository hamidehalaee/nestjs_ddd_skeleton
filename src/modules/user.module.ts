import { Module } from '@nestjs/common';
import { UserService, USER_REPOSITORY } from 'src/app/service/user.service';
import { PrismaService } from 'src/infra/persistence/prisma.service';
import { PrismaUserRepository } from 'src/infra/persistence/repos/user.repository';
import { UserController } from 'src/presentation/controllers/user.controller';

@Module({
  controllers: [UserController],
  providers: [
    UserService,
    PrismaService,
    {
      provide: USER_REPOSITORY,
      useClass: PrismaUserRepository,
    },
  ],
})
export class UserModule {}