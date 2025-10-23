import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { OpenaiService } from './openai.service';
import { OpenaiController } from './openai.controller';
import openaiConfig from './config/openai.config';
import { OpenAIRealtimeService } from './openai-realtime.service';

@Module({
  imports: [
    ConfigModule.forFeature(openaiConfig),
    EventEmitterModule.forRoot(),
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
  providers: [OpenaiService, OpenAIRealtimeService],
  exports: [OpenaiService, OpenAIRealtimeService],
})
export class OpenaiModule {}
