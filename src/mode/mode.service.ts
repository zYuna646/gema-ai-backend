import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { CreateModeDto } from './dto/create-mode.dto';
import { UpdateModeDto } from './dto/update-mode.dto';
import { FilterModeDto } from './dto/filter-mode.dto';
import { Mode } from './entities/mode.entity';

@Injectable()
export class ModeService {
  constructor(
    @InjectRepository(Mode)
    private modeRepository: Repository<Mode>,
  ) {}

  async create(createModeDto: CreateModeDto): Promise<Mode> {
    const mode = this.modeRepository.create(createModeDto);
    return await this.modeRepository.save(mode);
  }

  async findAll(filterModeDto: FilterModeDto) {
    const { name } = filterModeDto;
    const query = this.modeRepository.createQueryBuilder('mode');

    if (name) {
      query.andWhere('mode.name LIKE :name', { name: `%${name}%` });
    }

    const [data, total] = await query.getManyAndCount();

    return {
      data,
      total,
    };
  }

  async findOne(id: string): Promise<Mode> {
    const mode = await this.modeRepository.findOne({ where: { id } });
    if (!mode) {
      throw new NotFoundException(`Mode with ID ${id} not found`);
    }
    return mode;
  }

  async update(id: string, updateModeDto: UpdateModeDto): Promise<Mode> {
    const mode = await this.findOne(id);
    Object.assign(mode, updateModeDto);
    return await this.modeRepository.save(mode);
  }

  async remove(id: string): Promise<{ message: string }> {
    const mode = await this.findOne(id);
    await this.modeRepository.remove(mode);
    return { message: `Mode with ID ${id} has been deleted` };
  }
}
