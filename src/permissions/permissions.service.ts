import { Injectable, NotFoundException, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Like, Repository } from 'typeorm';
import { CreatePermissionDto } from './dto/create-permission.dto';
import { UpdatePermissionDto } from './dto/update-permission.dto';
import { Permission } from './entities/permission.entity';
import { FilterPermissionDto } from './dto/filter-permission.dto';
import { PaginationDto } from '../common/dto/pagination.dto';

@Injectable()
export class PermissionsService {
  constructor(
    @InjectRepository(Permission)
    private permissionRepository: Repository<Permission>,
  ) {}

  async create(createPermissionDto: CreatePermissionDto) {
    const permission = this.permissionRepository.create(createPermissionDto);
    return await this.permissionRepository.save(permission);
  }

  async findAll(filterDto: FilterPermissionDto) {
    const { page = 1, perPage = 10, search } = filterDto;
    const skip = (page - 1) * perPage;

    const whereCondition = search
      ? [{ name: Like(`%${search}%`) }, { slug: Like(`%${search}%`) }]
      : {};

    const [permissions, total] = await this.permissionRepository.findAndCount({
      where: whereCondition,
      skip,
      take: perPage,
      order: { name: 'ASC' },
    });

    return PaginationDto.create(permissions, total, page, perPage);
  }

  async findOne(id: string) {
    const permission = await this.permissionRepository.findOne({
      where: { id },
    });
    if (!permission) {
      throw new NotFoundException(`Permission dengan ID ${id} tidak ditemukan`);
    }
    return permission;
  }

  async update(id: string, updatePermissionDto: UpdatePermissionDto) {
    const permission = await this.findOne(id);
    this.permissionRepository.merge(permission, updatePermissionDto);
    return await this.permissionRepository.save(permission);
  }

  async remove(id: string) {
    const permission = await this.findOne(id);
    return await this.permissionRepository.remove(permission);
  }
}
