import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Role } from '../../roles/entities/role.entity';
import { RoleSeeder } from './role.seeder';

@Injectable()
export class UserSeeder {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Role)
    private roleRepository: Repository<Role>,
    private roleSeeder: RoleSeeder,
  ) {}

  async clear() {
    console.log('Clearing all users...');
    await this.userRepository.clear();
    console.log('All users cleared');
  }

  async clearAll() {
    // Clear data in reverse order (user -> role -> permission)
    await this.clear();
    await this.roleSeeder.clear();
    await this.roleSeeder.clearPermissions();
  }

  async seed() {
    try {
      // Pastikan role admin sudah di-seed terlebih dahulu
      const adminRole = await this.roleSeeder.seed();

      // Cek apakah user admin sudah ada
      let admin = await this.userRepository.findOne({
        where: { email: 'admin@example.com' },
        relations: ['role'],
      });

      if (admin) {
        // Update role jika user sudah ada
        admin.role = adminRole;
        await this.userRepository.save(admin);
        console.log('Admin user updated');
      } else {
        // Buat user admin baru
        admin = this.userRepository.create({
          name: 'Administrator',
          email: 'admin@example.com',
          password: 'admin123',
          role: adminRole, // Menambahkan role admin
        });
        await this.userRepository.save(admin);
        console.log('Admin user created');
      }

      return admin;
    } catch (error) {
      console.error('Error seeding users:', error.message);
      // Jika terjadi error, ambil user yang sudah ada
      const existingUser = await this.userRepository.findOne({
        where: { email: 'admin@example.com' },
        relations: ['role'],
      });

      if (existingUser) {
        return existingUser;
      }

      throw error;
    }
  }
}
