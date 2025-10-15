import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsNumber, Min, IsUUID } from 'class-validator';
import { Type } from 'class-transformer';

export class FilterUserDto {
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
    example: 'john',
    required: false,
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiProperty({
    description: 'Filter berdasarkan role ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
    required: false,
  })
  @IsOptional()
  @IsUUID()
  role_id?: string;
}
