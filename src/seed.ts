import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SeedCommand } from './database/seeders/seed.command';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);

  try {
    const seedCommand = app.get(SeedCommand);
    await seedCommand.run();

    console.log('Seeding completed successfully');
  } catch (error) {
    console.error('Seeding failed', error);
  } finally {
    await app.close();
  }
}

bootstrap();
