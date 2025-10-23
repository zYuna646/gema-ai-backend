import { PartialType } from '@nestjs/swagger';
import { CreateMessageDto } from './create-message.dto';
import { IsBoolean, IsOptional, IsString, IsUUID } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateMessageDto extends PartialType(CreateMessageDto) {
  @ApiPropertyOptional({
    description: 'Message content',
  })
  @IsOptional()
  @IsString()
  content?: string;

  @ApiPropertyOptional({
    description: 'Path to audio file',
  })
  @IsOptional()
  @IsString()
  audio_file?: string;

  @ApiPropertyOptional({
    description: 'Whether the message is from AI',
  })
  @IsOptional()
  @IsBoolean()
  is_ai?: boolean;
}
