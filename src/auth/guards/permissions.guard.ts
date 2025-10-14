import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import { JwtAuthGuard } from '../jwt-auth.guard';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private jwtAuthGuard: JwtAuthGuard,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Pastikan user sudah terautentikasi dengan JWT
    const isAuthenticated = await this.jwtAuthGuard.canActivate(context);
    if (!isAuthenticated) {
      return false;
    }

    // Ambil permission yang diperlukan dari metadata
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    // Jika tidak ada permission yang diperlukan, izinkan akses
    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    // Ambil user dari request
    const { user } = context.switchToHttp().getRequest();

    // Pastikan user memiliki data
    if (!user) {
      throw new UnauthorizedException('User tidak ditemukan');
    }

    // Pastikan user memiliki role dan permissions
    if (!user.role || !user.role.permissions) {
      throw new UnauthorizedException(
        'User tidak memiliki role atau permissions',
      );
    }

    // Periksa apakah user memiliki permission yang diperlukan
    const hasPermission = requiredPermissions.every((permission) =>
      user.role.permissions.some((p) => p.slug === permission),
    );

    if (!hasPermission) {
      throw new UnauthorizedException(
        'Anda tidak memiliki izin yang diperlukan',
      );
    }

    return true;
  }
}
