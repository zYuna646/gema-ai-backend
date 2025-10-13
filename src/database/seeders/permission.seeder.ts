import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Permission } from '../../permissions/entities/permission.entity';

@Injectable()
export class PermissionSeeder {
  constructor(
    @InjectRepository(Permission)
    private permissionRepository: Repository<Permission>,
  ) {}

  async clear() {
    console.log('Clearing all permissions...');
    await this.permissionRepository.clear();
    console.log('All permissions cleared');
  }

  async seed() {
    const permissions = [
      { name: 'Create User', slug: 'create-user' },
      { name: 'Read User', slug: 'read-user' },
      { name: 'Update User', slug: 'update-user' },
      { name: 'Delete User', slug: 'delete-user' },
      { name: 'Create Role', slug: 'create-role' },
      { name: 'Read Role', slug: 'read-role' },
      { name: 'Update Role', slug: 'update-role' },
      { name: 'Delete Role', slug: 'delete-role' },
      { name: 'Create Permission', slug: 'create-permission' },
      { name: 'Read Permission', slug: 'read-permission' },
      { name: 'Update Permission', slug: 'update-permission' },
      { name: 'Delete Permission', slug: 'delete-permission' },
    ];

    try {
      // Gunakan clear() untuk menghapus semua data terlebih dahulu
      // Ini sudah dipanggil dari RoleSeeder melalui clearPermissions()
      
      // Simpan semua permission sekaligus
      const createdPermissions = await this.permissionRepository.save(permissions);
      console.log('All permissions created');
      return createdPermissions;
    } catch (error) {
      console.error('Error seeding permissions:', error.message);
      // Jika terjadi error duplikasi, ambil permission yang sudah ada
      return await this.permissionRepository.find();
    }
  }
}
