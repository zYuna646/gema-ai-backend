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

  async seed() {
    // Pastikan role admin sudah di-seed terlebih dahulu
    const adminRole = await this.roleSeeder.seed();

    // Cek apakah user admin sudah ada
    const existingAdmin = await this.userRepository.findOne({
      where: { email: 'admin@example.com' },
    });

    if (existingAdmin) {
      console.log('Admin user already exists');
      return;
    }

    // Buat user admin
    const admin = this.userRepository.create({
      name: 'Administrator',
      email: 'admin@example.com',
      password: 'admin123',
    });

    await this.userRepository.save(admin);
    console.log('Admin user created');
  }
}