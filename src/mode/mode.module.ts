import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ModeService } from './mode.service';
import { ModeController } from './mode.controller';
import { Mode } from './entities/mode.entity';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [TypeOrmModule.forFeature([Mode]), forwardRef(() => AuthModule)],
  controllers: [ModeController],
  providers: [ModeService],
  exports: [ModeService],
})
export class ModeModule {}
