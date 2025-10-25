import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { JwtModule } from '@nestjs/jwt';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PermissionsModule } from './permissions/permissions.module';
import { RolesModule } from './roles/roles.module';
import { UsersModule } from './users/users.module';
import { PermissionSeeder } from './database/seeders/permission.seeder';
import { RoleSeeder } from './database/seeders/role.seeder';
import { UserSeeder } from './database/seeders/user.seeder';
import { SettingSeeder } from './database/seeders/setting.seeder';
import { ModeSeeder } from './database/seeders/mode.seeder';
import { SeedCommand } from './database/seeders/seed.command';
import { Permission } from './permissions/entities/permission.entity';
import { Role } from './roles/entities/role.entity';
import { User } from './users/entities/user.entity';
import { Setting } from './settings/entities/setting.entity';
import { Mode } from './mode/entities/mode.entity';
import { Conversation } from './conversation/entities/conversation.entity';
import { AuthModule } from './auth/auth.module';
import { SettingsModule } from './settings/settings.module';
import { TrialsModule } from './trials/trials.module';
import { QuotaModule } from './quota/quota.module';
import { ModeModule } from './mode/mode.module';
import { ConversationModule } from './conversation/conversation.module';
import { OpenaiModule } from './openai/openai.module';
import { MessageModule } from './message/message.module';
import { OpenAIRealtimeGateway } from './gateways/openai-realtime.gateway';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    EventEmitterModule.forRoot(),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '24h' },
      }),
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        url: configService.get('DATABASE_URL'),
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        synchronize: configService.get('NODE_ENV') !== 'production',
      }),
    }),
    TypeOrmModule.forFeature([
      Permission,
      Role,
      User,
      Setting,
      Mode,
      Conversation,
    ]),
    PermissionsModule,
    RolesModule,
    UsersModule,
    AuthModule,
    SettingsModule,
    TrialsModule,
    QuotaModule,
    ModeModule,
    ConversationModule,
    OpenaiModule,
    MessageModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    PermissionSeeder,
    RoleSeeder,
    UserSeeder,
    SettingSeeder,
    ModeSeeder,
    SeedCommand,
    OpenAIRealtimeGateway,
  ],
  exports: [
    PermissionSeeder,
    RoleSeeder,
    UserSeeder,
    SettingSeeder,
    ModeSeeder,
    SeedCommand,
  ],
})
export class AppModule {}
