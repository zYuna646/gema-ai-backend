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
import { ModeService } from './mode.service';
import { CreateModeDto } from './dto/create-mode.dto';
import { UpdateModeDto } from './dto/update-mode.dto';
import { FilterModeDto } from './dto/filter-mode.dto';
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

@ApiTags('Modes')
@Controller('modes')
export class ModeController {
  constructor(private readonly modeService: ModeService) {}

  @ApiOperation({ summary: 'Create a new mode' })
  @ApiResponse({ status: 201, description: 'Mode created successfully' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - insufficient permissions',
  })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('create-mode')
  @Post()
  create(@Body() createModeDto: CreateModeDto) {
    return this.modeService.create(createModeDto);
  }

  @ApiOperation({ summary: 'Get all modes' })
  @ApiResponse({
    status: 200,
    description: 'Return all modes with pagination',
  })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('read-mode')
  @Get()
  findAll(@Query() filterModeDto: FilterModeDto) {
    return this.modeService.findAll(filterModeDto);
  }

  @ApiOperation({ summary: 'Get a mode by ID' })
  @ApiResponse({ status: 200, description: 'Return the mode' })
  @ApiResponse({ status: 404, description: 'Mode not found' })
  @ApiParam({ name: 'id', description: 'Mode ID' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('read-mode')
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.modeService.findOne(id);
  }

  @ApiOperation({ summary: 'Update a mode' })
  @ApiResponse({ status: 200, description: 'Mode updated successfully' })
  @ApiResponse({ status: 404, description: 'Mode not found' })
  @ApiParam({ name: 'id', description: 'Mode ID' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('update-mode')
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateModeDto: UpdateModeDto) {
    return this.modeService.update(id, updateModeDto);
  }

  @ApiOperation({ summary: 'Delete a mode' })
  @ApiResponse({ status: 200, description: 'Mode deleted successfully' })
  @ApiResponse({ status: 404, description: 'Mode not found' })
  @ApiParam({ name: 'id', description: 'Mode ID' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('delete-mode')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.modeService.remove(id);
  }
}
