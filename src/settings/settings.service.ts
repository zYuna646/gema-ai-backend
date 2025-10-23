import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateSettingDto } from './dto/create-setting.dto';
import { UpdateSettingDto } from './dto/update-setting.dto';
import { Setting } from './entities/setting.entity';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class SettingsService {
  constructor(
    @InjectRepository(Setting)
    private settingsRepository: Repository<Setting>,
    @Inject('OPENAI_SERVICE') private openaiClient: ClientProxy,
  ) {}

  async create(createSettingDto: CreateSettingDto): Promise<Setting> {
    const setting = this.settingsRepository.create(createSettingDto);
    return this.settingsRepository.save(setting);
  }

  async findAll(): Promise<Setting[]> {
    return this.settingsRepository.find({
      order: {
        created_at: 'DESC',
      },
    });
  }

  async findOne(id: string): Promise<Setting> {
    const setting = await this.settingsRepository.findOne({ where: { id } });
    if (!setting) {
      throw new NotFoundException(`Setting with ID ${id} not found`);
    }
    return setting;
  }

  async update(
    id: string,
    updateSettingDto: UpdateSettingDto,
  ): Promise<Setting> {
    const setting = await this.findOne(id);
    this.settingsRepository.merge(setting, updateSettingDto);
    return this.settingsRepository.save(setting);
  }

  async remove(id: string): Promise<{ message: string }> {
    const setting = await this.findOne(id);
    await this.settingsRepository.remove(setting);
    return { message: `Setting with ID ${id} has been deleted` };
  }

  async initialize(createSettingDto: CreateSettingDto): Promise<Setting> {
    // Clear all existing settings
    await this.settingsRepository.clear();

    // Create new setting
    const setting = this.settingsRepository.create(createSettingDto);
    return this.settingsRepository.save(setting);
  }

  async getLatest(): Promise<Setting> {
    const settings = await this.settingsRepository.find({
      order: {
        created_at: 'DESC',
      },
      take: 1,
    });

    if (settings.length === 0) {
      throw new NotFoundException('No settings found');
    }

    return settings[0];
  }

  async getAvailableModels() {
    try {
      return await firstValueFrom(
        this.openaiClient.send('openai.get_models', {}),
      );
    } catch (error) {
      throw new Error(`Failed to fetch available models: ${error.message}`);
    }
  }
}
