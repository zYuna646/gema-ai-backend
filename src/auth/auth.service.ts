import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import * as bcrypt from 'bcrypt';
import { AuthResponseDto } from './dto/auth-response.dto';
import { RolesService } from '../roles/roles.service';
import { TrialsService } from '../trials/trials.service';
import { QuotaService } from 'src/quota/quota.service';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private rolesService: RolesService,
    private trialsService: TrialsService,
    private qoutaService: QuotaService,
  ) {}

  async login(loginDto: LoginDto): Promise<AuthResponseDto> {
    const user = await this.usersService.findByEmail(loginDto.email);

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(
      loginDto.password,
      user.password,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload = { sub: user.id, email: user.email };

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        permissions: user.role ? user.role.permissions : [],
      },
      accessToken: this.jwtService.sign(payload),
    };
  }

  async register(registerDto: RegisterDto): Promise<AuthResponseDto> {
    // Ambil role user langsung berdasarkan slug
    const userRole = await this.rolesService.findBySlug('user');
    console.log(userRole);

    if (!userRole) {
      throw new Error('User role not found');
    }

    const user = await this.usersService.create({
      name: registerDto.name,
      email: registerDto.email,
      password: registerDto.password,
      role_id: userRole.id,
    });

    // Buat trial untuk user yang baru register
    const trial = await this.trialsService.create({
      user_id: user.id,
    });

    const qouta = await this.qoutaService.create({
      user_id: user.id,
      minutes: trial.minutes,
      model_name: trial.constructor.name,
      model_id: trial.id,
    })

    const payload = { sub: user.id, email: user.email };

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        permissions: user.role ? user.role.permissions : [],
      },
      accessToken: this.jwtService.sign(payload),
    };
  }

  async verify(token: string) {
    try {
      // Pastikan token tidak kosong
      if (!token) {
        return {
          valid: false,
          message: 'Token tidak ditemukan',
        };
      }

      // Gunakan secret yang sama dengan yang digunakan untuk sign token
      // Hapus opsi secret untuk menggunakan default dari JwtModule
      const payload = this.jwtService.verify(token);

      // Cari user berdasarkan payload
      const user = await this.usersService.findOne(payload.sub);

      if (!user) {
        return {
          valid: false,
          message: 'User tidak ditemukan',
        };
      }

      return {
        valid: true,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          permissions: user.role ? user.role.permissions : [],
        },
      };
    } catch (error) {
      console.error('Error verifying token:', error.message);
      return {
        valid: false,
        message: 'Invalid token: ' + error.message,
      };
    }
  }

  async getProfile(userId: string): Promise<AuthResponseDto['user']> {
    const user = await this.usersService.findOne(userId);

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      permissions: user.role ? user.role.permissions : [],
    };
  }
}
