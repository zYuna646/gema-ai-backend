import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { UpdateConversationDto } from './dto/update-conversation.dto';
import { FilterConversationDto } from './dto/filter-conversation.dto';
import { Conversation } from './entities/conversation.entity';

@Injectable()
export class ConversationService {
  constructor(
    @InjectRepository(Conversation)
    private conversationRepository: Repository<Conversation>,
  ) {}

  async create(createConversationDto: CreateConversationDto) {
    const conversation = this.conversationRepository.create(createConversationDto);
    return await this.conversationRepository.save(conversation);
  }

  async findAll(filterConversationDto: FilterConversationDto) {
    const { name, mode_id } = filterConversationDto;
    const queryBuilder = this.conversationRepository.createQueryBuilder('conversation');
    
    if (name) {
      queryBuilder.andWhere('conversation.name LIKE :name', { name: `%${name}%` });
    }
    
    if (mode_id) {
      queryBuilder.andWhere('conversation.mode_id = :mode_id', { mode_id });
    }
    
    queryBuilder.leftJoinAndSelect('conversation.mode', 'mode');
    
    return await queryBuilder.getMany();
  }

  async findOne(id: string) {
    const conversation = await this.conversationRepository.findOne({
      where: { id },
      relations: ['mode'],
    });
    
    if (!conversation) {
      throw new NotFoundException(`Conversation with ID ${id} not found`);
    }
    
    return conversation;
  }

  async update(id: string, updateConversationDto: UpdateConversationDto) {
    const conversation = await this.findOne(id);
    
    Object.assign(conversation, updateConversationDto);
    
    return await this.conversationRepository.save(conversation);
  }

  async remove(id: string) {
    const conversation = await this.findOne(id);
    
    return await this.conversationRepository.remove(conversation);
  }
}
