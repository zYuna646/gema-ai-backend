import { ApiProperty } from '@nestjs/swagger';
import { IsDecimal, IsNotEmpty, IsString } from 'class-validator';

export class CreateQuotaDto {
  @ApiProperty({ example: 'user123', description: 'ID pengguna' })
  @IsNotEmpty()
  @IsString()
  user_id: string;

  @ApiProperty({ example: 10.5, description: 'Jumlah menit' })
  @IsNotEmpty()
  @IsDecimal()
  minutes: number;

  @ApiProperty({ example: 'trial', description: 'Nama model' })
  @IsNotEmpty()
  @IsString()
  model_name: string;

  @ApiProperty({ example: 'model123', description: 'ID model' })
  @IsNotEmpty()
  @IsString()
  model_id: string;
}
