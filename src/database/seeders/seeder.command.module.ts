import { Module } from '@nestjs/common';
import { SeederModule } from './seeder.module';
import { SeedCommand } from './seed.command';

@Module({
  imports: [SeederModule],
  providers: [SeedCommand],
})
export class SeederCommandModule {}
