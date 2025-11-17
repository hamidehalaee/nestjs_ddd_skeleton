import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsEmail, MinLength, Matches } from 'class-validator';

export class CreateUserDto {
  @IsString()
  @ApiProperty({ example: 'حمیده علایی', description: 'The name of the user' })
  name: string;

  @IsEmail()
  @ApiProperty({ example: 'alaee.work@gmail.com', description: 'The email of the user' })
  email: string;

  @IsString()
  @MinLength(6, { message: 'Password must be at least 6 characters long' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{6,}$/, {
    message:
      'Password must be at least 6 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character.',
  })
  @ApiProperty({ example: 'H@mideh5682', description: 'The email of the user' })
  password: string;
}