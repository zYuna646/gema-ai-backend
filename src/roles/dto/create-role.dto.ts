import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class CreateRoleDto {
  @ApiProperty({ example: 'Admin', description: 'Nama role' })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({ example: 'admin', description: 'Slug role' })
  @IsNotEmpty()
  @IsString()
  slug: string;

  @ApiProperty({
    example: ['uuid1', 'uuid2'],
    description: 'Array dari permission IDs',
    type: [String],
  })
  @IsArray()
  @IsUUID(4, { each: true })
  permission_ids: string[];
}
