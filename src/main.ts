import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Transport, MicroserviceOptions } from '@nestjs/microservices';
import { OpenaiModule } from './openai/openai.module';
import { Logger } from '@nestjs/common';

// Fungsi untuk menjalankan OpenAI microservice
async function bootstrapOpenAIMicroservice() {
  const logger = new Logger('OpenAI Microservice');
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    OpenaiModule,
    {
      transport: Transport.TCP,
      options: {
        host: process.env.HOST || 'localhost',
        port: process.env.PORT ? parseInt(process.env.PORT) : 3001,
      },
    },
  );

  await app.listen();
  logger.log(
    `OpenAI Microservice is running on: ${process.env.HOST || 'localhost'}:${process.env.PORT || 3001}`,
  );
}

async function bootstrap() {
  // Jalankan OpenAI microservice
  bootstrapOpenAIMicroservice().catch((err) => {
    console.error('Failed to start OpenAI microservice:', err);
  });
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  const port = configService.get('PORT') || 3000;

  // Mengaktifkan CORS untuk semua origin
  app.enableCors({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  // Menggunakan TransformInterceptor secara global
  app.useGlobalInterceptors(new TransformInterceptor());

  // Konfigurasi Swagger
  const config = new DocumentBuilder()
    .setTitle('Gema AI API')
    .setDescription('API dokumentasi untuk aplikasi Gema AI')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  await app.listen(port);
  console.log(`Application is running on: http://localhost:${port}`);
  console.log(
    `Swagger documentation is available at: http://localhost:${port}/api/docs`,
  );
}
bootstrap();
