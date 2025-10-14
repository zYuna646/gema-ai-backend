import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { SettingsService } from './settings.service';
import { CreateSettingDto } from './dto/create-setting.dto';
import { UpdateSettingDto } from './dto/update-setting.dto';
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

@ApiTags('Settings')
@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @ApiOperation({ summary: 'Create a new setting' })
  @ApiResponse({ status: 201, description: 'Setting created successfully' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - insufficient permissions',
  })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('create-setting')
  @Post()
  create(@Body() createSettingDto: CreateSettingDto) {
    return this.settingsService.create(createSettingDto);
  }

  @ApiOperation({ summary: 'Get all settings' })
  @ApiResponse({ status: 200, description: 'Return all settings' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - insufficient permissions',
  })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('read-setting')
  @Get()
  findAll() {
    return this.settingsService.findAll();
  }

  @ApiOperation({ summary: 'Get a setting by ID' })
  @ApiParam({ name: 'id', description: 'Setting ID' })
  @ApiResponse({ status: 200, description: 'Return the setting' })
  @ApiResponse({ status: 404, description: 'Setting not found' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - insufficient permissions',
  })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('read-setting')
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.settingsService.findOne(id);
  }

  @ApiOperation({ summary: 'Update a setting' })
  @ApiParam({ name: 'id', description: 'Setting ID' })
  @ApiResponse({ status: 200, description: 'Setting updated successfully' })
  @ApiResponse({ status: 404, description: 'Setting not found' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - insufficient permissions',
  })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('update-setting')
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateSettingDto: UpdateSettingDto) {
    return this.settingsService.update(id, updateSettingDto);
  }

  @ApiOperation({ summary: 'Delete a setting' })
  @ApiParam({ name: 'id', description: 'Setting ID' })
  @ApiResponse({ status: 200, description: 'Setting deleted successfully' })
  @ApiResponse({ status: 404, description: 'Setting not found' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - insufficient permissions',
  })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('delete-setting')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.settingsService.remove(id);
  }

  @ApiOperation({ summary: 'Initialize settings' })
  @ApiResponse({
    status: 201,
    description: 'Settings initialized successfully',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - insufficient permissions',
  })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('initialize-setting')
  @Post('initialize')
  initialize(@Body() createSettingDto: CreateSettingDto) {
    return this.settingsService.initialize(createSettingDto);
  }

  @ApiOperation({ summary: 'Get latest settings' })
  @ApiResponse({ status: 200, description: 'Return the latest settings' })
  @ApiResponse({ status: 404, description: 'No settings found' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - insufficient permissions',
  })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('read-setting')
  @Get('latest/settings')
  getLatest() {
    return this.settingsService.getLatest();
  }
}
