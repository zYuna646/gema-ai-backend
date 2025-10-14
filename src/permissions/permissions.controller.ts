import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
  HttpStatus,
} from '@nestjs/common';
import { PermissionsService } from './permissions.service';
import { CreatePermissionDto } from './dto/create-permission.dto';
import { UpdatePermissionDto } from './dto/update-permission.dto';
import { FilterPermissionDto } from './dto/filter-permission.dto';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';

@ApiTags('Permissions')
@Controller('permissions')
export class PermissionsController {
  constructor(private readonly permissionsService: PermissionsService) {}

  @ApiOperation({ summary: 'Create a new permission' })
  @ApiResponse({ status: 201, description: 'Permission created successfully' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - insufficient permissions',
  })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('create-permission')
  @Post()
  create(@Body() createPermissionDto: CreatePermissionDto) {
    return this.permissionsService.create(createPermissionDto);
  }

  @ApiOperation({ summary: 'Get all permissions' })
  @ApiResponse({
    status: 200,
    description: 'Return all permissions with pagination',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - insufficient permissions',
  })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('read-permission')
  @Get()
  findAll(@Query() filterDto: FilterPermissionDto) {
    return this.permissionsService.findAll(filterDto);
  }

  @ApiOperation({ summary: 'Get a permission by ID' })
  @ApiParam({ name: 'id', description: 'Permission ID' })
  @ApiResponse({ status: 200, description: 'Return the permission' })
  @ApiResponse({ status: 404, description: 'Permission not found' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - insufficient permissions',
  })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('read-permission')
  @Get(':id')
  async findOne(@Param('id') id: string) {
    try {
      const permission = await this.permissionsService.findOne(id);
      return {
        data: permission,
        meta: {
          options: {
            message: 'Permission berhasil ditemukan',
            code: HttpStatus.OK,
            status: true,
          },
        },
      };
    } catch (error) {
      return {
        data: null,
        meta: {
          options: {
            message: `Permission dengan id ${id} tidak ditemukan`,
            code: HttpStatus.NOT_FOUND,
            status: false,
          },
        },
      };
    }
  }

  @ApiOperation({ summary: 'Update a permission' })
  @ApiParam({ name: 'id', description: 'Permission ID' })
  @ApiResponse({ status: 200, description: 'Permission updated successfully' })
  @ApiResponse({ status: 404, description: 'Permission not found' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - insufficient permissions',
  })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('update-permission')
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updatePermissionDto: UpdatePermissionDto,
  ) {
    return this.permissionsService.update(id, updatePermissionDto);
  }

  @ApiOperation({ summary: 'Delete a permission' })
  @ApiParam({ name: 'id', description: 'Permission ID' })
  @ApiResponse({ status: 200, description: 'Permission deleted successfully' })
  @ApiResponse({ status: 404, description: 'Permission not found' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - insufficient permissions',
  })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('delete-permission')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.permissionsService.remove(id);
  }
}
