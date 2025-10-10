import { Controller, Get, Param, ParseIntPipe, NotFoundException } from '@nestjs/common';
import { AppService } from './app.service';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { UserResponseDto } from './common/dto/user.dto';

@ApiTags('App')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @ApiOperation({ summary: 'Get hello message' })
  @ApiResponse({ status: 200, description: 'Return hello message' })
  @Get()
  getHello() {
    return this.appService.getHello();
  }

  @ApiOperation({ summary: 'Get all users' })
  @ApiResponse({ 
    status: 200, 
    description: 'Return all users with pagination',
    type: UserResponseDto,
    isArray: true
  })
  @Get('users')
  getUsers() {
    return this.appService.getUsers();
  }

  @ApiOperation({ summary: 'Get user by ID' })
  @ApiParam({ name: 'id', description: 'User ID', type: Number })
  @ApiResponse({ 
    status: 200, 
    description: 'Return the user',
    type: UserResponseDto
  })
  @ApiResponse({ 
    status: 404, 
    description: 'User not found' 
  })
  @Get('users/:id')
  getUser(@Param('id', ParseIntPipe) id: number) {
    // Contoh: jika id > 10, anggap user tidak ditemukan
    if (id > 10) {
      return this.appService.getUserNotFound(id);
    }
    return this.appService.getUser(id);
  }
}
