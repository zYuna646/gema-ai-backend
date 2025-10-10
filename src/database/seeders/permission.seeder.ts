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

    for (const permission of permissions) {
      const existingPermission = await this.permissionRepository.findOne({
        where: { slug: permission.slug },
      });

      if (!existingPermission) {
        await this.permissionRepository.save(permission);
        console.log(`Permission created: ${permission.name}`);
      } else {
        console.log(`Permission already exists: ${permission.name}`);
      }
    }
  }
}
