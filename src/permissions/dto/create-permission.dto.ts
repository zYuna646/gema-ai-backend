import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class CreatePermissionDto {
  @ApiProperty({ example: 'Create User', description: 'Nama permission' })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({ example: 'create-user', description: 'Slug permission' })
  @IsNotEmpty()
  @IsString()
  slug: string;
}
