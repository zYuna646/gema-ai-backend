import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  IsEnum,
} from 'class-validator';
import { RoleType } from '../entities/mode.entity';

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

  @ApiProperty({
    example: 'system',
    description: 'Role type (system, user, assistant)',
    enum: RoleType,
    default: RoleType.SYSTEM,
  })
  @IsOptional()
  @IsEnum(RoleType)
  role: RoleType;
}
