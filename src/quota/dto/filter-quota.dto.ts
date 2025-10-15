import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class FilterQuotaDto {
  @ApiProperty({
    description: 'Halaman yang ingin ditampilkan',
    example: 1,
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiProperty({
    description: 'Jumlah data per halaman',
    example: 10,
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  perPage?: number = 10;

  @ApiProperty({
    description: 'Kata kunci pencarian',
    example: 'trial',
    required: false,
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiProperty({
    description: 'Filter berdasarkan user ID',
    example: 'user123',
    required: false,
  })
  @IsOptional()
  @IsString()
  user_id?: string;
}
