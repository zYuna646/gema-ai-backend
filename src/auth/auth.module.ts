import { Module, forwardRef } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { UsersModule } from '../users/users.module';
import { JwtStrategy } from './jwt.strategy';
import { JwtAuthGuard } from './jwt-auth.guard';
import { PermissionsGuard } from './guards/permissions.guard';
import { RolesModule } from '../roles/roles.module';
import { TrialsModule } from '../trials/trials.module';

@Module({
  imports: [
    forwardRef(() => UsersModule),
    PassportModule,
    forwardRef(() => RolesModule),
    forwardRef(() => TrialsModule),
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'your_jwt_secret_key',
      signOptions: { expiresIn: '1d' },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, JwtAuthGuard, PermissionsGuard],
  exports: [AuthService, JwtAuthGuard, PermissionsGuard],
})
export class AuthModule {}
