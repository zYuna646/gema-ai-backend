import {
  Controller,
  Post,
  Body,
  Get,
  UseGuards,
  Req,
  Headers,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtAuthGuard } from './jwt-auth.guard';
import type { RequestWithUser } from './interfaces/request-with-user.interface';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
  ApiParam,
  ApiHeader,
} from '@nestjs/swagger';
import { AuthResponseDto } from './dto/auth-response.dto';
import { DashboardResponseDto } from './dto/dashboard-response.dto';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @ApiOperation({ summary: 'Login user' })
  @ApiBody({ type: LoginDto })
  @ApiResponse({
    status: 200,
    description: 'User successfully logged in',
    type: AuthResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  @Post('login')
  login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @ApiOperation({ summary: 'Register new user' })
  @ApiBody({ type: RegisterDto })
  @ApiResponse({
    status: 201,
    description: 'User successfully registered',
    type: AuthResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Email already exists' })
  @Post('register')
  register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @ApiOperation({ summary: 'Verify JWT token' })
  @ApiBearerAuth()
  @ApiResponse({
    status: 200,
    description: 'Token is valid',
    schema: {
      type: 'object',
      properties: {
        valid: {
          type: 'boolean',
          example: true,
        },
        user: {
          type: 'object',
          properties: {
            id: { type: 'number', example: 1 },
            name: { type: 'string', example: 'John Doe' },
            email: { type: 'string', example: 'john@example.com' },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized or invalid token' })
  @Post('verify')
  async verify(@Headers('authorization') authHeader: string) {
    try {
      // Extract token from Bearer header
      console.log('Auth Header:', authHeader);

      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return {
          valid: false,
          message: 'Token tidak valid: Format header tidak sesuai',
        };
      }

      const token = authHeader.split(' ')[1];
      console.log('Token extracted:', token);

      return await this.authService.verify(token);
    } catch (error) {
      console.error('Error in verify endpoint:', error);
      return {
        valid: false,
        message: 'Error verifying token: ' + error.message,
      };
    }
  }

  @ApiOperation({ summary: 'Get user profile' })
  @ApiResponse({
    status: 200,
    description: 'User profile retrieved successfully',
    type: AuthResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('profile')
  getProfile(@Req() req: RequestWithUser) {
    console.log('User from request:', req.user);
    return this.authService.getProfile(req.user.id);
  }

  @ApiOperation({ summary: 'Get user dashboard information' })
  @ApiResponse({
    status: 200,
    description: 'Dashboard information retrieved successfully',
    type: DashboardResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('dashboard')
  getDashboard(@Req() req: RequestWithUser) {
    return this.authService.getDashboard(req.user.id);
  }
}
