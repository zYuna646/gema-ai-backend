import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class CreateModeDto {
  @ApiProperty({ example: 'Creative', description: 'Nama mode' })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({
    example: 'Mode untuk menghasilkan konten kreatif',
    description: 'Context mode',
  })
  @IsNotEmpty()
  @IsString()
  context: string;

  @ApiProperty({
    example: 0.7,
    description: 'Temperature setting (0.0-1.0)',
    default: 0.7,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  temperature: number;
}
