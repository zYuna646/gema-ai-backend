import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateMessageDto } from './dto/create-message.dto';
import { UpdateMessageDto } from './dto/update-message.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Message } from './entities/message.entity';

@Injectable()
export class MessageService {
  constructor(
    @InjectRepository(Message)
    private messageRepository: Repository<Message>,
  ) {}

  async create(
    createMessageDto: CreateMessageDto,
    audioFile?: Express.Multer.File,
  ): Promise<Message> {
    const messageData = { ...createMessageDto };

    if (audioFile) {
      messageData.audio_file = audioFile.filename;
    }

    const message = this.messageRepository.create(messageData);
    return await this.messageRepository.save(message);
  }

  async findAll(): Promise<Message[]> {
    return await this.messageRepository.find({
      relations: ['conversation', 'user'],
    });
  }

  async findByConversation(conversationId: string): Promise<Message[]> {
    return await this.messageRepository.find({
      where: { conversation_id: conversationId },
      relations: ['user'],
      order: { created_at: 'ASC' },
    });
  }

  async findOne(id: string): Promise<Message> {
    const message = await this.messageRepository.findOne({
      where: { id },
      relations: ['conversation', 'user'],
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
