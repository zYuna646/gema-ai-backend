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

  async getSummaryByUserId(userId: string) {
    const currentDate = new Date();

    // Mendapatkan trial terbaru
    const latestTrial = await this.trialRepository.findOne({
      where: { user_id: userId },
      order: { created_at: 'DESC' },
    });

    // Mendapatkan trial yang aktif (jika ada)
    const activeTrial = await this.trialRepository.findOne({
      where: {
        user_id: userId,
        start_date: LessThanOrEqual(currentDate),
        end_date: MoreThanOrEqual(currentDate),
      },
    });

    // Jika tidak ada trial sama sekali
    if (!latestTrial) {
      return {
        data: {
          hasTrials: false,
          latestTrial: null,
          isActive: false,
          remainingDays: 0,
          remainingMinutes: 0,
        },
        meta: {
          message: `Tidak ada trial untuk user dengan ID ${userId}`,
          status: true,
        },
      };
    }

    // Menghitung sisa hari jika trial aktif
    let remainingDays = 0;
    if (activeTrial) {
      const endDate = new Date(activeTrial.end_date);
      const diffTime = Math.abs(endDate.getTime() - currentDate.getTime());
      remainingDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }

    return {
      hasTrials: true,
      latestTrial: {
        id: latestTrial.id,
        startDate: latestTrial.start_date,
        endDate: latestTrial.end_date,
        minutes: Number(latestTrial.minutes),
      },
      isActive: !!activeTrial,
      remainingDays: remainingDays,
      remainingMinutes: activeTrial ? Number(activeTrial.minutes) : 0,
    };
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
