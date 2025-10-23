import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateMessageDto } from './dto/create-message.dto';
import { UpdateMessageDto } from './dto/update-message.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Message } from './entities/message.entity';
import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';
import { exec } from 'child_process';

@Injectable()
export class MessageService {
  private execPromise = promisify(exec);

  constructor(
    @InjectRepository(Message)
    private messageRepository: Repository<Message>,
  ) {}

  private async getAudioDuration(filePath: string): Promise<number> {
    try {
      // Menggunakan ffprobe untuk mendapatkan durasi audio dalam detik
      const { stdout } = await this.execPromise(
        `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${filePath}"`,
      );

      // Konversi durasi dari detik ke menit
      const durationInSeconds = parseFloat(stdout.trim());
      const durationInMinutes = durationInSeconds / 60;

      return parseFloat(durationInMinutes.toFixed(2));
    } catch (error) {
      console.error('Error getting audio duration:', error);
      return 0;
    }
  }

  async create(
    createMessageDto: CreateMessageDto,
    audioFile?: Express.Multer.File,
  ): Promise<Message> {
    const messageData = { ...createMessageDto };

    if (audioFile) {
      messageData.audio_file = audioFile.filename;

      // Hitung durasi audio jika file audio ada
      const audioFilePath = path.join(
        process.cwd(),
        'uploads',
        'audio',
        audioFile.filename,
      );
      if (fs.existsSync(audioFilePath)) {
        const durationInMinutes = await this.getAudioDuration(audioFilePath);
        messageData.audio_minutes = durationInMinutes;
      }
    }

    const message = this.messageRepository.create(messageData);
    return await this.messageRepository.save(message);
  }

  async findAll(): Promise<Message[]> {
    return await this.messageRepository.find({
      relations: ['user'],
    });
  }

  async findOne(id: string): Promise<Message> {
    const message = await this.messageRepository.findOne({
      where: { id },
      relations: ['user'],
    });

    if (!message) {
      throw new NotFoundException(`Message with ID ${id} not found`);
    }

    return message;
  }

  async update(
    id: string,
    updateMessageDto: UpdateMessageDto,
  ): Promise<Message> {
    const message = await this.findOne(id);

    Object.assign(message, updateMessageDto);

    return await this.messageRepository.save(message);
  }

  async remove(id: string): Promise<{ message: string }> {
    const message = await this.findOne(id);

    await this.messageRepository.remove(message);

    return { message: `Message with ID ${id} has been deleted` };
  }
}
