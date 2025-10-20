import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class CreateConversationDto {
  @ApiProperty({
    example: 'My Project Conversation',
    description: 'The name of the conversation',
  })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'The ID of the mode associated with this conversation',
  })
  @IsNotEmpty()
  @IsUUID()
  mode_id: string;
}