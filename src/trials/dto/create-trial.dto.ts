import { ApiProperty } from '@nestjs/swagger';
import { IsNumber } from 'class-validator';

export class CreateTrialDto {
  @ApiProperty({ description: 'User ID' })
  user_id: string;
}
