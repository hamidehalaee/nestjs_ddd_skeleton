import { User } from './user.entity';

export interface UserRepository {
  create(data: { name: string; email: string }): Promise<User>;
  findAll(): Promise<User[]>;
  findOne(id: number): Promise<User | null>;
  update(id: number, data: Partial<{ name: string; email: string }>): Promise<User>;
  remove(id: number): Promise<void>;
}