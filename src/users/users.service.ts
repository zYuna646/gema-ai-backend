import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Like, Repository } from 'typeorm';
import { FilterUserDto } from './dto/filter-user.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User } from './entities/user.entity';
import { PaginationDto } from '../common/dto/pagination.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async create(createUserDto: CreateUserDto) {
    // Cek apakah email sudah digunakan
    const existingUser = await this.userRepository.findOne({
      where: { email: createUserDto.email },
    });

    if (existingUser) {
      throw new ConflictException('Email sudah digunakan');
    }

    const user = this.userRepository.create(createUserDto);
    return await this.userRepository.save(user);
  }

  async findAll(filterDto: FilterUserDto) {
    const { page = 1, perPage = 10, search, role_id } = filterDto;
    const skip = (page - 1) * perPage;

    let whereCondition: any = {};
    
    if (search) {
      whereCondition = [
        { name: Like(`%${search}%`) }, 
        { email: Like(`%${search}%`) }
      ];
    }
    
    if (role_id) {
      if (Array.isArray(whereCondition)) {
        // Jika whereCondition adalah array (karena ada search)
        whereCondition = whereCondition.map(condition => ({
          ...condition,
          role: { id: role_id }
        }));
      } else {
        // Jika whereCondition adalah object
        whereCondition.role = { id: role_id };
      }
    }

    const [users, total] = await this.userRepository.findAndCount({
      where: whereCondition,
      select: ['id', 'name', 'email', 'created_at', 'updated_at'],
      skip,
      take: perPage,
      order: { name: 'ASC' },
      relations: ['role'],
    });

    return PaginationDto.create(users, total, page, perPage);
  }

  async findOne(id: string) {
    const user = await this.userRepository.findOne({
      where: { id },
      relations: ['role'],
      select: ['id', 'name', 'email', 'password', 'created_at', 'updated_at'],
    });

    if (!user) {
      throw new NotFoundException(`User dengan ID ${id} tidak ditemukan`);
    }

    return user;
  }

  async findByEmail(email: string) {
    const user = await this.userRepository.findOne({
      where: { email },
      relations: ['role'],
      select: ['id', 'name', 'email', 'password', 'created_at', 'updated_at'],
    });

    return user;
  }

  async update(id: string, updateUserDto: UpdateUserDto) {
    // Cek apakah user ada
    const user = await this.findOne(id);

    // Cek apakah email sudah digunakan oleh user lain
    if (updateUserDto.email) {
      const existingUser = await this.userRepository.findOne({
        where: { email: updateUserDto.email },
      });

      if (existingUser && existingUser.id !== id) {
        throw new ConflictException('Email sudah digunakan');
      }
    }

    await this.userRepository.update(id, updateUserDto);
    return await this.findOne(id);
  }

  async remove(id: string) {
    const user = await this.findOne(id);
    return await this.userRepository.remove(user);
  }
}
