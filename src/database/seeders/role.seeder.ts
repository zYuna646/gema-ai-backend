import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Role } from '../../roles/entities/role.entity';
import { Permission } from '../../permissions/entities/permission.entity';
import { PermissionSeeder } from './permission.seeder';

@Injectable()
export class RoleSeeder {
  constructor(
    @InjectRepository(Role)
    private roleRepository: Repository<Role>,
    @InjectRepository(Permission)
    private permissionRepository: Repository<Permission>,
    private permissionSeeder: PermissionSeeder,
  ) {}

  async seed() {
    // Pastikan permission sudah di-seed terlebih dahulu
    await this.permissionSeeder.seed();

    // Cek apakah role admin sudah ada
    const existingRole = await this.roleRepository.findOne({
      where: { slug: 'admin' },
    });

    if (existingRole) {
      console.log('Role admin already exists');
      return existingRole;
    }

    // Ambil semua permission
    const permissions = await this.permissionRepository.find();

    // Buat role admin dengan semua permission
    const adminRole = this.roleRepository.create({
      name: 'Administrator',
      slug: 'admin',
      permissions: permissions,
    });

    await this.roleRepository.save(adminRole);
    console.log('Role admin created with all permissions');

    return adminRole;
  }
}