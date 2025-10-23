import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MinLength,
  IsUUID,
  IsEnum,
  IsOptional,
} from 'class-validator';
import { SoundType } from '../entities/user.entity';

export class CreateUserDto {
  @ApiProperty({ example: 'John Doe', description: 'Nama pengguna' })
  @IsNotEmpty({ message: 'Nama tidak boleh kosong' })
  @IsString({ message: 'Nama harus berupa string' })
  name: string;

  @ApiProperty({ example: 'john@example.com', description: 'Email pengguna' })
  @IsNotEmpty({ message: 'Email tidak boleh kosong' })
  @IsEmail({}, { message: 'Format email tidak valid' })
  email: string;

  @ApiProperty({ example: 'password123', description: 'Password pengguna' })
  @IsNotEmpty({ message: 'Password tidak boleh kosong' })
  @MinLength(6, { message: 'Password minimal 6 karakter' })
  password: string;

  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'ID Role pengguna',
  })
  @IsNotEmpty({ message: 'Role ID tidak boleh kosong' })
  @IsUUID(4, { message: 'Format Role ID tidak valid' })
  role_id: string;

  @ApiProperty({
    enum: SoundType,
    default: SoundType.ALLOY,
    description: 'Tipe suara untuk text-to-speech',
  })
  @IsOptional()
  @IsEnum(SoundType, { message: 'Tipe suara tidak valid' })
  sound_type?: SoundType;
}
