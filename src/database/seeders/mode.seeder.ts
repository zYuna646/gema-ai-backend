import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Mode, RoleType } from '../../mode/entities/mode.entity';

@Injectable()
export class ModeSeeder {
  constructor(
    @InjectRepository(Mode)
    private modeRepository: Repository<Mode>,
  ) {}

  async clear() {
    console.log('Clearing all modes...');
    await this.modeRepository.clear();
    console.log('All modes cleared');
  }

  async seed() {
    const modes = [
      {
        name: 'Curhat',
        desc: 'Mode untuk berbagi cerita dan mencurahkan perasaan',
        context:
          'Kamu adalah seorang pendengar yang baik dan empati. Tugasmu adalah mendengarkan cerita pengguna dengan penuh perhatian, memberikan dukungan emosional, dan memberikan respon yang hangat dan pengertian. Jangan memberikan nasihat kecuali diminta. Fokus pada validasi perasaan dan memberikan ruang aman untuk berbagi. Gunakan bahasa yang lembut, supportif, dan tidak menghakimi.',
        temperature: 0.8,
        role: RoleType.SYSTEM,
      },
      {
        name: 'Teman',
        desc: 'Mode untuk berbincang santai seperti dengan teman dekat',
        context:
          'Kamu adalah teman dekat yang menyenangkan dan mudah diajak bicara. Berbicaralah dengan gaya santai, ramah, dan akrab seperti teman sebaya. Gunakan bahasa yang tidak terlalu formal, sesekali bisa menggunakan bahasa gaul yang wajar. Tunjukkan antusiasme dalam percakapan, berikan respon yang natural dan spontan. Kamu bisa bercanda, berbagi pengalaman, dan membuat suasana menjadi lebih ceria dan nyaman.',
        temperature: 0.9,
        role: RoleType.SYSTEM,
      },
    ];

    try {
      // Clear existing modes first
      await this.clear();

      // Create new modes
      const createdModes: Mode[] = [];
      for (const modeData of modes) {
        const mode = await this.modeRepository.save(modeData);
        createdModes.push(mode);
        console.log(`Mode '${mode.name}' created:`, mode);
      }

      console.log('All modes seeded successfully');
      return createdModes;
    } catch (error) {
      console.error('Error seeding modes:', error.message);
      // If there's an error, try to get existing modes
      const existingModes = await this.modeRepository.find();
      return existingModes || [];
    }
  }
}
