import { Command, CommandRunner } from 'nest-commander';
import { Injectable } from '@nestjs/common';
import { UserSeeder } from './user.seeder';

@Injectable()
@Command({ name: 'seed', description: 'Seed database with initial data' })
export class SeedCommand extends CommandRunner {
  constructor(private userSeeder: UserSeeder) {
    super();
  }

  async run(): Promise<void> {
    try {
      console.log('Starting database seeding...');

      // Menjalankan user seeder (yang akan menjalankan role dan permission seeder)
      await this.userSeeder.seed();

      console.log('Database seeding completed successfully');
    } catch (error) {
      console.error('Error during database seeding:', error);
    }
  }
}
