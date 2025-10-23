import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class CreateMessageDto {
  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'ID of the user',
  })
  @IsNotEmpty()
  @IsUUID()
  user_id: string;

  @ApiProperty({
    example: 'Hello, how are you?',
    description: 'Message content',
  })
  @IsNotEmpty()
  @IsString()
  content: string;

  @ApiProperty({
    type: 'string',
    format: 'binary',
    description: 'Audio file (optional)',
    required: false,
  })
  @IsOptional()
  audio_file?: any;

  @ApiProperty({
    example: false,
    description: 'Whether the message is from AI',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  is_ai?: boolean;

  @ApiProperty({
    example: 2.5,
    description: 'Durasi audio dalam menit (dihitung otomatis)',
    required: false,
  })
  @IsOptional()
  audio_minutes?: number;
}
