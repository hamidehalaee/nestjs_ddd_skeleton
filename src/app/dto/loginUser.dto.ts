import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength } from 'class-validator';

export class LoginUserDto {
  @ApiProperty({ example: 'حمیده علایی', description: 'The name of the user', required: false })
  @IsEmail()
  email: string;

  @IsString()
  @ApiProperty({ example: 'حمیده علایی', description: 'The name of the user', required: false })
  @MinLength(8)
  password: string;
}