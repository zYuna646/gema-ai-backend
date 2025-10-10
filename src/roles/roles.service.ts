import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { Role } from './entities/role.entity';
import { PermissionsService } from '../permissions/permissions.service';

@Injectable()
export class RolesService {
  constructor(
    @InjectRepository(Role)
    private roleRepository: Repository<Role>,
    private permissionsService: PermissionsService,
  ) {}

  async create(createRoleDto: CreateRoleDto) {
    const { permission_ids, ...roleData } = createRoleDto;

    // Membuat role baru
    const role = this.roleRepository.create(roleData);

    // Menambahkan permissions jika ada
    if (permission_ids && permission_ids.length > 0) {
      role.permissions = [];
      for (const permissionId of permission_ids) {
        const permission = await this.permissionsService.findOne(permissionId);
        role.permissions.push(permission);
      }
    }

    return await this.roleRepository.save(role);
  }

  async findAll() {
    return await this.roleRepository.find();
  }

  async findOne(id: string) {
    const role = await this.roleRepository.findOne({
      where: { id },
      relations: ['permissions'],
    });

    if (!role) {
      throw new NotFoundException(`Role dengan ID ${id} tidak ditemukan`);
    }

    return role;
  }

  async update(id: string, updateRoleDto: UpdateRoleDto) {
    const { permission_ids, ...roleData } = updateRoleDto;

    // Mencari role yang akan diupdate
    const role = await this.findOne(id);

    // Update data role
    this.roleRepository.merge(role, roleData);

    // Update permissions jika ada
    if (permission_ids) {
      role.permissions = [];
      for (const permissionId of permission_ids) {
        const permission = await this.permissionsService.findOne(permissionId);
        role.permissions.push(permission);
      }
    }

    return await this.roleRepository.save(role);
  }

  async remove(id: string) {
    const role = await this.findOne(id);
    return await this.roleRepository.remove(role);
  }
}
