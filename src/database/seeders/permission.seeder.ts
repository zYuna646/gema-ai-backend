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

    // Use a transaction to handle foreign key constraints
    const queryRunner =
      this.permissionRepository.manager.connection.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // First clear the role_permissions junction table
      await queryRunner.query('TRUNCATE TABLE "role_permissions" CASCADE');
      // Then clear the permissions table
      await queryRunner.query('TRUNCATE TABLE "permissions" CASCADE');

      await queryRunner.commitTransaction();
      console.log('All permissions cleared');
    } catch (error) {
      await queryRunner.rollbackTransaction();
      console.error('Error clearing permissions:', error.message);
      throw error;
    } finally {
      await queryRunner.release();
    }
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
      { name: 'Create Setting', slug: 'create-setting' },
      { name: 'Read Setting', slug: 'read-setting' },
      { name: 'Update Setting', slug: 'update-setting' },
      { name: 'Delete Setting', slug: 'delete-setting' },
      { name: 'Initialize Setting', slug: 'initialize-setting' },
      { name: 'Create Trial', slug: 'create-trial' },
      { name: 'Read Trial', slug: 'read-trial' },
      { name: 'Update Trial', slug: 'update-trial' },
      { name: 'Delete Trial', slug: 'delete-trial' },
      { name: 'Create Quota', slug: 'create-quota' },
      { name: 'Read Quota', slug: 'read-quota' },
      { name: 'Update Quota', slug: 'update-quota' },
      { name: 'Delete Quota', slug: 'delete-quota' },
      { name: 'Create Mode', slug: 'create-mode' },
      { name: 'Read Mode', slug: 'read-mode' },
      { name: 'Update Mode', slug: 'update-mode' },
      { name: 'Delete Mode', slug: 'delete-mode' },
      { name: 'Create Conversation', slug: 'create-conversation' },
      { name: 'Read Conversation', slug: 'read-conversation' },
      { name: 'Update Conversation', slug: 'update-conversation' },
      { name: 'Delete Conversation', slug: 'delete-conversation' },
      { name: 'Create Message', slug: 'create-message' },
      { name: 'Read Message', slug: 'read-message' },
      { name: 'Update Message', slug: 'update-message' },
      { name: 'Delete Message', slug: 'delete-message' },
      { name: 'Create OpenAI', slug: 'create-openai' },
      { name: 'Read OpenAI', slug: 'read-openai' },
      { name: 'Update OpenAI', slug: 'update-openai' },
      { name: 'Delete OpenAI', slug: 'delete-openai' },
      { name: 'Read OpenAI Models', slug: 'read-openai-models' },
    ];

    try {
      // Gunakan clear() untuk menghapus semua data terlebih dahulu
      // Ini sudah dipanggil dari RoleSeeder melalui clearPermissions()

      // Simpan semua permission sekaligus
      const createdPermissions =
        await this.permissionRepository.save(permissions);
      console.log('All permissions created');
      return createdPermissions;
    } catch (error) {
      console.error('Error seeding permissions:', error.message);
      // Jika terjadi error duplikasi, ambil permission yang sudah ada
      return await this.permissionRepository.find();
    }
  }
}
