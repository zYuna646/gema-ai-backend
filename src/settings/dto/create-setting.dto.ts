import { ApiProperty } from '@nestjs/swagger';
import {
  IsNumber,
  IsNotEmpty,
  Min,
  IsString,
  IsOptional,
} from 'class-validator';

export class CreateSettingDto {
  @ApiProperty({ description: 'Number of trial days', example: 30 })
  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  trial_day: number;

  @ApiProperty({ description: 'Number of trial minutes', example: 60.5 })
  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  trial_minutes: number;

  @ApiProperty({
    description: 'Default OpenAI model',
    example: 'gpt-4o',
    required: false,
  })
  @IsOptional()
  @IsString()
  model?: string;

  @ApiProperty({
    description: 'Default max tokens for OpenAI requests',
    example: 2000,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  max_tokens?: number;
}
