import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsEmail, IsOptional } from 'class-validator';

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  @ApiProperty({ example: 'حمیده علایی', description: 'The name of the user', required: false })
  name?: string;

  @IsOptional()
  @IsEmail()
  @ApiProperty({ example: 'alaee.work@gmail.com', description: 'The email of the user', required: false })
  email?: string;
}