import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID } from 'class-validator';

export class UpdateConversationDto {
  @ApiPropertyOptional({
    description: 'The name of the conversation',
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({
    description: 'The ID of the mode associated with this conversation',
  })
  @IsOptional()
  @IsUUID()
  mode_id?: string;
}
