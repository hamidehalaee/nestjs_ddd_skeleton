import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { User } from 'src/domain/user/user.entity';
import { UserRepository } from 'src/domain/user/userRepository.interface';

@Injectable()
export class PrismaUserRepository implements UserRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: { name: string; email: string; password: string; refreshToken: string }): Promise<User> {
    return this.prisma.user.create({ data });
  }

  async findAll(): Promise<User[]> {
    return this.prisma.user.findMany();
  }

  async findOne(id: number): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }

  async findOneByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { email } });
  }

  async update(id: number, data: Partial<{ name: string; email: string; password: string; refreshToken?: string }>): Promise<User> {
    return this.prisma.user.update({ where: { id }, data });
  }

  async remove(id: number): Promise<void> {
    await this.prisma.user.delete({ where: { id } });
  }
}