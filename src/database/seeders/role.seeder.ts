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
        relations: ['permissions']
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

      return adminRole;
    } catch (error) {
      console.error('Error seeding roles:', error.message);
      // Jika terjadi error, ambil role yang sudah ada
      const existingRole = await this.roleRepository.findOne({
        where: { slug: 'admin' },
        relations: ['permissions']
      });
      
      if (existingRole) {
        return existingRole;
      }
      
      throw error;
    }
  }
}
