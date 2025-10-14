import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { UserSeeder } from './database/seeders/user.seeder';
import { SettingSeeder } from './database/seeders/setting.seeder';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);

  try {
    const userSeeder = app.get(UserSeeder);
    await userSeeder.seed();

    const settingSeeder = app.get(SettingSeeder);
    await settingSeeder.seed();

    console.log('Seeding completed successfully');
  } catch (error) {
    console.error('Seeding failed', error);
  } finally {
    await app.close();
  }
}

bootstrap();
