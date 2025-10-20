import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID } from 'class-validator';

export class FilterConversationDto {
  @ApiPropertyOptional({
    description: 'Filter by conversation name',
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({
    description: 'Filter by mode ID',
  })
  @IsOptional()
  @IsUUID()
  mode_id?: string;
}