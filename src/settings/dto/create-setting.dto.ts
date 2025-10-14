import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsNotEmpty, Min } from 'class-validator';

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
}
