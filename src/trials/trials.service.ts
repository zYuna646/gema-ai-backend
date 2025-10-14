import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThanOrEqual, MoreThanOrEqual, Repository } from 'typeorm';
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

  findAll() {
    return this.trialRepository.find();
  }

  findOne(id: string) {
    return this.trialRepository.findOne({ where: { id } });
  }

  async getActiveByUserId(userId: string) {
    const currentDate = new Date();
    return this.trialRepository.findOne({
      where: {
        user_id: userId,
        start_date: LessThanOrEqual(currentDate),
        end_date: MoreThanOrEqual(currentDate),
      },
    });
  }

  async getHistoryByUserId(userId: string) {
    return this.trialRepository.find({
      where: { user_id: userId },
      order: { created_at: 'DESC' },
    });
  }

  update(id: string, updateTrialDto: UpdateTrialDto) {
    return this.trialRepository.update(id, updateTrialDto);
  }

  remove(id: string) {
    return this.trialRepository.delete(id);
  }
}
