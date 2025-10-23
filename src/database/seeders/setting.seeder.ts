import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Setting } from '../../settings/entities/setting.entity';

@Injectable()
export class SettingSeeder {
  constructor(
    @InjectRepository(Setting)
    private settingRepository: Repository<Setting>,
  ) {}

  async clear() {
    console.log('Clearing all settings...');
    await this.settingRepository.clear();
    console.log('All settings cleared');
  }

  async seed() {
    const setting = {
      trial_day: 7,
      trial_minutes: 100,
      model: 'gpt-4o',
      max_tokens: 2000,
    };

    try {
      // Clear existing settings first
      await this.clear();

      // Create new setting
      const createdSetting = await this.settingRepository.save(setting);
      console.log('Default setting created:', createdSetting);
      return createdSetting;
    } catch (error) {
      console.error('Error seeding setting:', error.message);
      // If there's an error, try to get existing setting
      const existingSetting = await this.settingRepository.find({
        order: { created_at: 'DESC' },
        take: 1,
      });
      return existingSetting[0] || null;
    }
  }
}
