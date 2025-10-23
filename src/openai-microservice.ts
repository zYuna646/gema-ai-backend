import { NestFactory } from '@nestjs/core';
import { Transport, MicroserviceOptions } from '@nestjs/microservices';
import { OpenaiModule } from './openai/openai.module';
import { Logger } from '@nestjs/common';

async function bootstrap() {
  const logger = new Logger('OpenAI Microservice');

  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    OpenaiModule,
    {
      transport: Transport.TCP,
      options: {
        host: 'localhost',
        port: 3001,
      },
    },
  );

  await app.listen();
  logger.log('OpenAI Microservice is running on: localhost:3001');
}

bootstrap();
