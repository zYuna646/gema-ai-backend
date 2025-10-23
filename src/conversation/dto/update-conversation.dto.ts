import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { SoundType } from '../entities/conversation.entity';

export class UpdateConversationDto {
  @ApiPropertyOptional({
    description: 'The name of the conversation',
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({
    description: 'The ID of the mode associated with this conversation',
  })
  @IsOptional()
  @IsUUID()
  mode_id?: string;

  @ApiPropertyOptional({
    description: 'The ID of the user who owns this conversation',
  })
  @IsOptional()
  @IsUUID()
  user_id?: string;

  @ApiPropertyOptional({
    description: 'The sound type for the conversation',
    enum: SoundType,
  })
  @IsOptional()
  @IsEnum(SoundType)
  sound?: SoundType;
}
