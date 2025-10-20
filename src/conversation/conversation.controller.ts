import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards } from '@nestjs/common';
import { ConversationService } from './conversation.service';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { UpdateConversationDto } from './dto/update-conversation.dto';
import { FilterConversationDto } from './dto/filter-conversation.dto';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';

@ApiTags('conversation')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('conversation')
export class ConversationController {
  constructor(private readonly conversationService: ConversationService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new conversation' })
  @RequirePermissions('create-conversation')
  create(@Body() createConversationDto: CreateConversationDto) {
    return this.conversationService.create(createConversationDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all conversations with optional filtering' })
  @RequirePermissions('read-conversation')
  findAll(@Query() filterConversationDto: FilterConversationDto) {
    return this.conversationService.findAll(filterConversationDto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a conversation by ID' })
  @RequirePermissions('read-conversation')
  findOne(@Param('id') id: string) {
    return this.conversationService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a conversation' })
  @RequirePermissions('update-conversation')
  update(@Param('id') id: string, @Body() updateConversationDto: UpdateConversationDto) {
    return this.conversationService.update(id, updateConversationDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a conversation' })
  @RequirePermissions('delete-conversation')
  remove(@Param('id') id: string) {
    return this.conversationService.remove(id);
  }
}
