import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsEmail } from 'class-validator';

export class CreateUserDto {
  @IsString()
  @ApiProperty({ example: 'حمیده علایی', description: 'The name of the user' })
  name: string;

  @IsEmail()
  @ApiProperty({ example: 'alaee.work@gmail.com', description: 'The email of the user' })
  email: string;
}