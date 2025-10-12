import { Inject, Injectable } from '@nestjs/common';
import { User } from 'src/domain/user/user.entity';
import { UserRepository } from 'src/domain/user/userRepository.interface';
import { CreateUserDto } from '../dto/createUser.dto';
import { UpdateUserDto } from '../dto/updateUser.dto';

// Injection token for the repository interface
export const USER_REPOSITORY = Symbol('USER_REPOSITORY');

@Injectable()
export class UserService {
  constructor(@Inject(USER_REPOSITORY) private readonly userRepository: UserRepository) {}

  async create(createUserDto: CreateUserDto): Promise<User> {
    return this.userRepository.create(createUserDto);
  }

  async findAll(): Promise<User[]> {
    return this.userRepository.findAll();
  }

  async findOne(id: number): Promise<User | null> {
    return this.userRepository.findOne(id);
  }

  async update(id: number, updateUserDto: UpdateUserDto): Promise<User> {
    return this.userRepository.update(id, updateUserDto);
  }

  async remove(id: number): Promise<void> {
    return this.userRepository.remove(id);
  }
}