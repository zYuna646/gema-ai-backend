import { PartialType } from '@nestjs/swagger';
import { CreateModeDto } from './create-mode.dto';
import {
  IsOptional,
  IsString,
  IsNumber,
  IsBoolean,
  IsEnum,
} from 'class-validator';
import { RoleType } from '../entities/mode.entity';

export class UpdateModeDto extends PartialType(CreateModeDto) {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsEnum(RoleType)
  role?: RoleType;
}
