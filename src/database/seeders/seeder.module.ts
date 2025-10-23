import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Permission } from '../../permissions/entities/permission.entity';
import { Role } from '../../roles/entities/role.entity';
import { User } from '../../users/entities/user.entity';
import { Setting } from '../../settings/entities/setting.entity';
import { Mode } from '../../mode/entities/mode.entity';
import { PermissionSeeder } from './permission.seeder';
import { RoleSeeder } from './role.seeder';
import { UserSeeder } from './user.seeder';
import { SettingSeeder } from './setting.seeder';
import { ModeSeeder } from './mode.seeder';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT || '5432', 10),
      username: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_DATABASE,
      entities: [Permission, Role, User, Setting, Mode],
      synchronize: process.env.NODE_ENV !== 'production',
    }),
    TypeOrmModule.forFeature([Permission, Role, User, Setting, Mode]),
  ],
  providers: [
    PermissionSeeder,
    RoleSeeder,
    UserSeeder,
    SettingSeeder,
    ModeSeeder,
  ],
  exports: [
    PermissionSeeder,
    RoleSeeder,
    UserSeeder,
    SettingSeeder,
    ModeSeeder,
  ],
})
export class SeederModule {}
