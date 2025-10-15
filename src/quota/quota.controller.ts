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
import { QuotaService } from './quota.service';
import { CreateQuotaDto } from './dto/create-quota.dto';
import { UpdateQuotaDto } from './dto/update-quota.dto';
import { FilterQuotaDto } from './dto/filter-quota.dto';
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

@ApiTags('Quota')
@Controller('quota')
export class QuotaController {
  constructor(private readonly quotaService: QuotaService) {}

  @ApiOperation({ summary: 'Create a new quota' })
  @ApiResponse({ status: 201, description: 'Quota created successfully' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - insufficient permissions',
  })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('create-quota')
  @Post()
  create(@Body() createQuotaDto: CreateQuotaDto) {
    return this.quotaService.create(createQuotaDto);
  }

  @ApiOperation({ summary: 'Get all quotas' })
  @ApiResponse({
    status: 200,
    description: 'Return all quotas with pagination',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - insufficient permissions',
  })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('read-quota')
  @Get()
  findAll(@Query() filterDto: FilterQuotaDto) {
    return this.quotaService.findAll(filterDto);
  }

  @ApiOperation({ summary: 'Get a quota by ID' })
  @ApiParam({ name: 'id', description: 'Quota ID' })
  @ApiResponse({ status: 200, description: 'Return the quota' })
  @ApiResponse({ status: 404, description: 'Quota not found' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - insufficient permissions',
  })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('read-quota')
  @Get(':id')
  async findOne(@Param('id') id: string) {
    try {
      const quota = await this.quotaService.findOne(id);
      return {
        data: quota,
        meta: {
          options: {
            message: 'Quota berhasil ditemukan',
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
            message: `Quota dengan id ${id} tidak ditemukan`,
            code: HttpStatus.NOT_FOUND,
            status: false,
          },
        },
      };
    }
  }

  @ApiOperation({ summary: 'Get quotas by user ID' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'Return the quotas for user' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - insufficient permissions',
  })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('read-quota')
  @Get('user/:userId')
  findByUserId(
    @Param('userId') userId: string,
    @Query() filterDto: FilterQuotaDto,
  ) {
    return this.quotaService.findByUserId(userId, filterDto);
  }

  @ApiOperation({ summary: 'Get total minutes by user ID' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'Return total minutes for user' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - insufficient permissions',
  })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('read-quota')
  @Get('user/:userId/total-minutes')
  getTotalMinutesByUserId(@Param('userId') userId: string) {
    return this.quotaService.getTotalMinutesByUserId(userId);
  }

  @ApiOperation({ summary: 'Update a quota' })
  @ApiParam({ name: 'id', description: 'Quota ID' })
  @ApiResponse({ status: 200, description: 'Quota updated successfully' })
  @ApiResponse({ status: 404, description: 'Quota not found' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - insufficient permissions',
  })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('update-quota')
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateQuotaDto: UpdateQuotaDto) {
    return this.quotaService.update(id, updateQuotaDto);
  }

  @ApiOperation({ summary: 'Delete a quota' })
  @ApiParam({ name: 'id', description: 'Quota ID' })
  @ApiResponse({ status: 200, description: 'Quota deleted successfully' })
  @ApiResponse({ status: 404, description: 'Quota not found' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - insufficient permissions',
  })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('delete-quota')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.quotaService.remove(id);
  }
}
