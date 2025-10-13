import { Controller, Get, Post, Body, Patch, Param, Delete, ParseIntPipe, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBody, ApiBearerAuth } from '@nestjs/swagger';
import { CreateUserDto } from 'src/app/dto/createUser.dto';
import { UpdateUserDto } from 'src/app/dto/updateUser.dto';
import { UserService } from 'src/app/service/user.service';
import { User } from 'src/domain/user/user.entity';
import { JwtAuthGuard } from 'src/infra/auth/auth.guard';

@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new user and return tokens' })
  @ApiBody({ type: CreateUserDto })
  @ApiResponse({ status: 201, description: 'User created with tokens', type: Object })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  create(@Body() createUserDto: CreateUserDto) {
    return this.userService.create(createUserDto);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Retrieve all users' })
  @ApiResponse({ status: 200, description: 'List of users', type: [CreateUserDto] })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  findAll() {
    return this.userService.findAll();
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Retrieve a user by ID' })
  @ApiParam({ name: 'id', description: 'User ID', type: Number })
  @ApiResponse({ status: 200, description: 'User found', type: CreateUserDto })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.userService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Update a user by ID' })
  @ApiParam({ name: 'id', description: 'User ID', type: Number })
  @ApiBody({ type: UpdateUserDto })
  @ApiResponse({ status: 200, description: 'User updated successfully', type: CreateUserDto })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  update(@Param('id', ParseIntPipe) id: number, @Body() updateUserDto: UpdateUserDto) {
    return this.userService.update(id, updateUserDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Delete a user by ID' })
  @ApiParam({ name: 'id', description: 'User ID', type: Number })
  @ApiResponse({ status: 200, description: 'User deleted successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.userService.remove(id);
  }
}