import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThanOrEqual, MoreThanOrEqual, Repository, Like } from 'typeorm';
import { PaginationDto } from '../common/dto/pagination.dto';
import { FilterTrialDto } from './dto/filter-trial.dto';
import { CreateTrialDto } from './dto/create-trial.dto';
import { UpdateTrialDto } from './dto/update-trial.dto';
import { Trial } from './entities/trial.entity';
import { SettingsService } from '../settings/settings.service';

@Injectable()
export class TrialsService {
  constructor(
    @InjectRepository(Trial)
    private trialRepository: Repository<Trial>,
    private settingsService: SettingsService,
  ) {}

  async create(createTrialDto: CreateTrialDto) {
    const settings = await this.settingsService.getLatest();
    if (!settings) {
      throw new NotFoundException('Settings not found');
    }

    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + settings.trial_day);

    const trial = this.trialRepository.create({
      user_id: createTrialDto.user_id,
      start_date: startDate,
      end_date: endDate,
      minutes: settings.trial_minutes,
    });

    return this.trialRepository.save(trial);
  }

  async findAll(filterDto: FilterTrialDto) {
    const { page = 1, perPage = 10, search } = filterDto;
    const skip = (page - 1) * perPage;

    const whereCondition = search ? [{ user_id: Like(`%${search}%`) }] : {};

    const [trials, total] = await this.trialRepository.findAndCount({
      where: whereCondition,
      skip,
      take: perPage,
      order: { created_at: 'DESC' },
    });

    return PaginationDto.create(trials, total, page, perPage);
  }

  findOne(id: string) {
    return this.trialRepository.findOne({ where: { id } });
  }

  async getActiveByUserId(userId: string, filterDto: FilterTrialDto) {
    const currentDate = new Date();
    return this.trialRepository.findOne({
      where: {
        user_id: userId,
        start_date: LessThanOrEqual(currentDate),
        end_date: MoreThanOrEqual(currentDate),
      },
    });
  }

  async getHistoryByUserId(userId: string, filterDto: FilterTrialDto) {
    const { page = 1, perPage = 10 } = filterDto;
    const skip = (page - 1) * perPage;

    const [trials, total] = await this.trialRepository.findAndCount({
      where: { user_id: userId },
      skip,
      take: perPage,
      order: { created_at: 'DESC' },
    });

    return PaginationDto.create(trials, total, page, perPage);
  }

  update(id: string, updateTrialDto: UpdateTrialDto) {
    return this.trialRepository.update(id, updateTrialDto);
  }

  remove(id: string) {
    return this.trialRepository.delete(id);
  }
}
