import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class FilterModeDto {
  @ApiProperty({
    required: false,
    example: 'Creative',
    description: 'Filter by name',
  })
  @IsOptional()
  @IsString()
  name?: string;
}
