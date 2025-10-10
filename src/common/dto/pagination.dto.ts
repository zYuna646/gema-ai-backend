import { PaginationMeta } from '../interfaces/api-response.interface';

export class PaginationDto {
  static create(
    data: any[],
    total: number,
    page: number,
    limit: number,
  ): { data: any[]; meta: { pagination: PaginationMeta } } {
    const lastPage = Math.ceil(total / limit);
    
    return {
      data,
      meta: {
        pagination: {
          current_page: page,
          per_page: limit,
          total,
          last_page: lastPage,
        },
      },
    };
  }
}