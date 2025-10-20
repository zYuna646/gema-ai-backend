import { PartialType } from '@nestjs/swagger';
import { CreateModeDto } from './create-mode.dto';
import { IsOptional, IsString, IsNumber, IsBoolean } from 'class-validator';

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
}
