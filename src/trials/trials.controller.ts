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
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import { TrialsService } from './trials.service';
import { CreateTrialDto } from './dto/create-trial.dto';
import { UpdateTrialDto } from './dto/update-trial.dto';
import { FilterTrialDto } from './dto/filter-trial.dto';
import { Trial } from './entities/trial.entity';

@ApiTags('trials')
@Controller('trials')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class TrialsController {
  constructor(private readonly trialsService: TrialsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new trial' })
  @ApiResponse({
    status: 201,
    description: 'Trial created successfully',
    type: Trial,
  })
  @RequirePermissions('create-trial')
  create(@Body() createTrialDto: CreateTrialDto) {
    return this.trialsService.create(createTrialDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all trials' })
  @ApiResponse({
    status: 200,
    description: 'Return all trials with pagination',
    type: [Trial],
  })
  @RequirePermissions('read-trial')
  findAll(@Query() filterDto: FilterTrialDto) {
    return this.trialsService.findAll(filterDto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a trial by id' })
  @ApiParam({ name: 'id', description: 'Trial ID' })
  @ApiResponse({
    status: 200,
    description: 'Return a trial by id',
    type: Trial,
  })
  @RequirePermissions('read-trial')
  async findOne(@Param('id') id: string) {
    const trial = await this.trialsService.findOne(id);
    if (trial) {
      return {
        data: trial,
        meta: {
          options: {
            message: 'Trial berhasil ditemukan',
            code: HttpStatus.OK,
            status: true,
          },
        },
      };
    }
    return {
      data: null,
      meta: {
        options: {
          message: `Trial dengan id ${id} tidak ditemukan`,
          code: HttpStatus.NOT_FOUND,
          status: false,
        },
      },
    };
  }

  @Get('active/user/:userId')
  @ApiOperation({ summary: 'Get active trial by user id' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiResponse({
    status: 200,
    description: 'Return active trial for user',
    type: Trial,
  })
  @RequirePermissions('read-trial')
  getActiveByUserId(@Param('userId') userId: string) {
    return this.trialsService.getActiveByUserId(userId);
  }

  @Get('history/user/:userId')
  @ApiOperation({ summary: 'Get trial history by user id' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiResponse({
    status: 200,
    description: 'Return trial history for user',
    type: [Trial],
  })
  @RequirePermissions('read-trial')
  getHistoryByUserId(@Param('userId') userId: string) {
    return this.trialsService.getHistoryByUserId(userId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a trial' })
  @ApiParam({ name: 'id', description: 'Trial ID' })
  @ApiResponse({ status: 200, description: 'Trial updated successfully' })
  @RequirePermissions('update-trial')
  update(@Param('id') id: string, @Body() updateTrialDto: UpdateTrialDto) {
    return this.trialsService.update(id, updateTrialDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a trial' })
  @ApiParam({ name: 'id', description: 'Trial ID' })
  @ApiResponse({ status: 200, description: 'Trial deleted successfully' })
  @RequirePermissions('delete-trial')
  remove(@Param('id') id: string) {
    return this.trialsService.remove(id);
  }
}
