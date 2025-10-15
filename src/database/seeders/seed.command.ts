import { Command, CommandRunner } from 'nest-commander';
import { Injectable } from '@nestjs/common';
import { UserSeeder } from './user.seeder';
import { RoleSeeder } from './role.seeder';
import { PermissionSeeder } from './permission.seeder';
import { SettingSeeder } from './setting.seeder';

@Injectable()
@Command({ name: 'seed', description: 'Seed database with initial data' })
export class SeedCommand extends CommandRunner {
  constructor(
    private userSeeder: UserSeeder,
    private roleSeeder: RoleSeeder,
    private permissionSeeder: PermissionSeeder,
    private settingSeeder: SettingSeeder,
  ) {
    super();
  }

  async run(): Promise<void> {
    try {
      console.log('Starting database seeding...');

      // Menghapus semua data yang ada terlebih dahulu
      console.log('Clearing existing data...');
      await this.userSeeder.clear();
      await this.roleSeeder.clear();
      await this.permissionSeeder.clear();
      await this.settingSeeder.clear();

      console.log('All existing data cleared');

      // Menjalankan user seeder (yang akan menjalankan role dan permission seeder)
      await this.userSeeder.seed();

      console.log('Database seeding completed successfully');
    } catch (error) {
      console.error('Error during database seeding:', error);
    }
  }
}
