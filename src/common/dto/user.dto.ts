import { ApiProperty } from '@nestjs/swagger';
import { ApiResponse } from '../interfaces/api-response.interface';

export class UserDto {
  @ApiProperty({ example: 1, description: 'ID pengguna' })
  id: number;

  @ApiProperty({ example: 'John Doe', description: 'Nama pengguna' })
  name: string;

  @ApiProperty({ example: 'john@example.com', description: 'Email pengguna' })
  email: string;
}

export class UserResponseDto implements ApiResponse<UserDto> {
  @ApiProperty({ example: 200, description: 'Kode status HTTP' })
  code: number;

  @ApiProperty({ example: true, description: 'Status keberhasilan' })
  status: boolean;

  @ApiProperty({
    example: 'Berhasil mendapatkan data pengguna',
    description: 'Pesan respons',
  })
  message: string;

  @ApiProperty({ type: UserDto, description: 'Data pengguna' })
  data: UserDto;
}

export class PaginationMetaDto {
  @ApiProperty({ example: 1, description: 'Halaman saat ini' })
  current_page: number;

  @ApiProperty({ example: 10, description: 'Jumlah item per halaman' })
  per_page: number;

  @ApiProperty({ example: 100, description: 'Total item' })
  total: number;

  @ApiProperty({ example: 10, description: 'Halaman terakhir' })
  last_page: number;
}

export class UsersResponseDto implements ApiResponse<UserDto[]> {
  @ApiProperty({ example: 200, description: 'Kode status HTTP' })
  code: number;

  @ApiProperty({ example: true, description: 'Status keberhasilan' })
  status: boolean;

  @ApiProperty({
    example: 'Berhasil mendapatkan daftar pengguna',
    description: 'Pesan respons',
  })
  message: string;

  @ApiProperty({ type: [UserDto], description: 'Daftar pengguna' })
  data: UserDto[];

  @ApiProperty({ type: PaginationMetaDto, description: 'Informasi pagination' })
  pagination: PaginationMetaDto;
}
