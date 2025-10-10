import { PartialType } from '@nestjs/swagger';
import { CreateUserDto } from './create-user.dto';
import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

export class UpdateUserDto extends PartialType(CreateUserDto) {
  @ApiProperty({
    example: 'John Doe',
    description: 'Nama pengguna',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'Nama harus berupa string' })
  name?: string;

  @ApiProperty({
    example: 'john@example.com',
    description: 'Email pengguna',
    required: false,
  })
  @IsOptional()
  @IsEmail({}, { message: 'Format email tidak valid' })
  email?: string;

  @ApiProperty({
    example: 'password123',
    description: 'Password pengguna',
    required: false,
  })
  @IsOptional()
  @MinLength(6, { message: 'Password minimal 6 karakter' })
  password?: string;
}
