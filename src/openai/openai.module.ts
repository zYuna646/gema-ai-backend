import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { OpenaiService } from './openai.service';
import { OpenaiController } from './openai.controller';
import openaiConfig from './config/openai.config';

@Module({
  imports: [
    ConfigModule.forFeature(openaiConfig),
    ClientsModule.register([
      {
        name: 'OPENAI_SERVICE',
        transport: Transport.TCP,
        options: {
          host: 'localhost',
          port: 3001,
        },
      },
    ]),
  ],
  controllers: [OpenaiController],
  providers: [OpenaiService],
  exports: [OpenaiService],
})
export class OpenaiModule {}
