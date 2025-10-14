import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TrialsService } from './trials.service';
import { TrialsController } from './trials.controller';
import { Trial } from './entities/trial.entity';
import { SettingsModule } from '../settings/settings.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Trial]),
    forwardRef(() => AuthModule),
    SettingsModule,
  ],
  controllers: [TrialsController],
  providers: [TrialsService],
  exports: [TrialsService],
})
export class TrialsModule {}
