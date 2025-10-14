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

  async clear() {
    console.log('Clearing all roles...');
    await this.roleRepository.clear();
    console.log('All roles cleared');
  }

  async clearPermissions() {
    // Clear permissions
    await this.permissionSeeder.clear();
  }

  async seed() {
    try {
      // Pastikan permission sudah di-seed terlebih dahulu
      const permissions = await this.permissionSeeder.seed();

      // Cek apakah role admin sudah ada
      let adminRole = await this.roleRepository.findOne({
        where: { slug: 'admin' },
        relations: ['permissions'],
      });

      if (adminRole) {
        // Update permissions jika role sudah ada
        adminRole.permissions = permissions;
        await this.roleRepository.save(adminRole);
        console.log('Role admin updated with all permissions');
      } else {
        // Buat role admin baru dengan semua permission
        adminRole = this.roleRepository.create({
          name: 'Administrator',
          slug: 'admin',
          permissions: permissions,
        });
        await this.roleRepository.save(adminRole);
        console.log('Role admin created with all permissions');
      }

      // Definisikan slug permission yang dibutuhkan untuk role user
      const userPermissionSlugs = ['read-trial'];
      
      // Cari semua permission yang dibutuhkan untuk role user
      const userPermissions = await this.permissionRepository.find({
        where: userPermissionSlugs.map(slug => ({ slug })),
      });

      if (userPermissions.length === 0) {
        console.error('No permissions found for user role');
        return adminRole;
      }

      // Cek apakah role user sudah ada
      let userRole = await this.roleRepository.findOne({
        where: { slug: 'user' },
        relations: ['permissions'],
      });

      if (userRole) {
        // Update permissions jika role sudah ada
        userRole.permissions = userPermissions;
        await this.roleRepository.save(userRole);
        console.log(`Role user updated with ${userPermissions.length} permissions`);
      } else {
        // Buat role user baru dengan permission yang sudah ditentukan
        userRole = this.roleRepository.create({
          name: 'User',
          slug: 'user',
          permissions: userPermissions,
        });
        await this.roleRepository.save(userRole);
        console.log(`Role user created with ${userPermissions.length} permissions`);
      }

      return adminRole;
    } catch (error) {
      console.error('Error seeding roles:', error.message);
      // Jika terjadi error, ambil role yang sudah ada
      const existingRole = await this.roleRepository.findOne({
        where: { slug: 'admin' },
        relations: ['permissions'],
      });

      if (existingRole) {
        return existingRole;
      }

      throw error;
    }
  }
}
