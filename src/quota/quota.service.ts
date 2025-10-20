import { Injectable, NotFoundException, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Like, Repository } from 'typeorm';
import { CreateQuotaDto } from './dto/create-quota.dto';
import { UpdateQuotaDto } from './dto/update-quota.dto';
import { Quota } from './entities/quota.entity';
import { FilterQuotaDto } from './dto/filter-quota.dto';
import { PaginationDto } from '../common/dto/pagination.dto';

@Injectable()
export class QuotaService {
  constructor(
    @InjectRepository(Quota)
    private quotaRepository: Repository<Quota>,
  ) {}

  async create(createQuotaDto: CreateQuotaDto) {
    const quota = this.quotaRepository.create(createQuotaDto);
    return await this.quotaRepository.save(quota);
  }

  async findAll(filterDto: FilterQuotaDto) {
    const { page = 1, perPage = 10, search, user_id } = filterDto;
    const skip = (page - 1) * perPage;

    let whereCondition = {};

    if (search) {
      whereCondition = [{ model_name: Like(`%${search}%`) }];
    }

    if (user_id) {
      whereCondition = {
        ...whereCondition,
        user_id,
      };
    }

    const [quotas, total] = await this.quotaRepository.findAndCount({
      where: whereCondition,
      skip,
      take: perPage,
      order: { created_at: 'DESC' },
    });

    return PaginationDto.create(quotas, total, page, perPage);
  }

  async findOne(id: string) {
    const quota = await this.quotaRepository.findOne({
      where: { id },
    });
    if (!quota) {
      throw new NotFoundException(`Quota dengan ID ${id} tidak ditemukan`);
    }
    return quota;
  }

  async findByUserId(userId: string, filterDto: FilterQuotaDto) {
    const { page = 1, perPage = 10, search } = filterDto;
    const skip = (page - 1) * perPage;

    let whereCondition: any = { user_id: userId };

    if (search) {
      whereCondition = [{ user_id: userId, model_name: Like(`%${search}%`) }];
    }

    const [quotas, total] = await this.quotaRepository.findAndCount({
      where: whereCondition,
      skip,
      take: perPage,
      order: { created_at: 'DESC' },
    });

    if (!quotas.length) {
      return {
        data: [],
        meta: {
          options: {
            message: `Tidak ada quota untuk user dengan ID ${userId}`,
            code: HttpStatus.OK,
            status: true,
          },
          pagination: {
            page,
            perPage,
            total,
            totalPages: Math.ceil(total / perPage),
          },
        },
      };
    }

    return {
      data: quotas,
      meta: {
        options: {
          message: `Quota untuk user dengan ID ${userId} berhasil ditemukan`,
          code: HttpStatus.OK,
          status: true,
        },
        pagination: {
          page,
          perPage,
          total,
          totalPages: Math.ceil(total / perPage),
        },
      },
    };
  }

  async getTotalMinutesByUserId(userId: string) {
    const result = await this.quotaRepository
      .createQueryBuilder('quota')
      .select('SUM(quota.minutes)', 'totalMinutes')
      .where('quota.user_id = :userId', { userId })
      .getRawOne();

    return {
      data: {
        user_id: userId,
        totalMinutes: result.totalMinutes || 0,
      },
      meta: {
        options: {
          message: `Total menit untuk user dengan ID ${userId} berhasil dihitung`,
          code: HttpStatus.OK,
          status: true,
        },
      },
    };
  }

  async getSummaryByUserId(userId: string) {
    // Mendapatkan total quota
    const totalResult = await this.quotaRepository
      .createQueryBuilder('quota')
      .select('SUM(quota.minutes)', 'totalMinutes')
      .where('quota.user_id = :userId', { userId })
      .getRawOne();

    // Mendapatkan quota yang sudah digunakan (untuk sementara diisi 0)
    const usedQuota = 0;
    
    // Menghitung sisa quota
    const totalQuota = Number(totalResult.totalMinutes) || 0;
    const remainingQuota = totalQuota - usedQuota;

    return {
      data: {
        user_id: userId,
        totalQuota,
        usedQuota,
        remainingQuota
      },
      meta: {
        options: {
          message: `Summary quota untuk user dengan ID ${userId} berhasil dihitung`,
          code: HttpStatus.OK,
          status: true,
        },
      },
    };
  }

  async update(id: string, updateQuotaDto: UpdateQuotaDto) {
    const quota = await this.findOne(id);
    this.quotaRepository.merge(quota, updateQuotaDto);
    const updated = await this.quotaRepository.save(quota);

    return {
      data: updated,
      meta: {
        options: {
          message: `Quota dengan ID ${id} berhasil diperbarui`,
          code: HttpStatus.OK,
          status: true,
        },
      },
    };
  }

  async remove(id: string) {
    const quota = await this.findOne(id);
    await this.quotaRepository.remove(quota);

    return {
      meta: {
        options: {
          message: `Quota dengan ID ${id} berhasil dihapus`,
          code: HttpStatus.OK,
          status: true,
        },
      },
    };
  }
}
