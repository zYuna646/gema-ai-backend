import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';

export class AudioConversationDto {
  @ApiProperty({
    description: 'ID percakapan',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsOptional()
  @IsUUID()
  conversationId?: string;

  @ApiProperty({
    description: 'Audio dalam format base64',
    example: 'data:audio/webm;base64,UklGRiSAR0...',
  })
  @IsNotEmpty()
  @IsString()
  audioBase64: string;

  @ApiProperty({
    description: 'Model OpenAI yang akan digunakan',
    example: 'gpt-4o',
    required: false,
  })
  @IsOptional()
  @IsString()
  model?: string;

  @ApiProperty({
    description: 'Temperature untuk respons OpenAI (0.0-1.0)',
    example: 0.7,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  temperature?: number;

  @ApiProperty({
    description: 'Jumlah maksimum token untuk respons',
    example: 2000,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  maxTokens?: number;
}
