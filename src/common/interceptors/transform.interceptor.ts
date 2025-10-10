import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  HttpStatus,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import {
  ApiResponse,
  PaginationMeta,
  ApiResponseOptions,
} from '../interfaces/api-response.interface';

export interface Response<T> {
  data: T;
  meta?: {
    pagination?: PaginationMeta;
    options?: ApiResponseOptions;
  };
}

@Injectable()
export class TransformInterceptor<T>
  implements NestInterceptor<T, ApiResponse<any>>
{
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<ApiResponse<any>> {
    const statusCode = context.switchToHttp().getResponse().statusCode;

    return next.handle().pipe(
      map((response: any) => {
        const isSuccess = statusCode >= 200 && statusCode < 300;

        // Jika response adalah null atau undefined, kembalikan response kosong
        if (response === null || response === undefined) {
          return {
            code: statusCode || HttpStatus.OK,
            status: isSuccess,
            message: isSuccess ? 'Success' : 'Failed',
            data: null,
          };
        }

        // Ekstrak data dan options dari response
        const responseData =
          response?.data !== undefined ? response.data : response;
        const options = response?.meta?.options || {};
        const pagination = response?.meta?.pagination;

        // Buat response dengan format yang diinginkan
        return {
          code:
            options.code !== undefined
              ? options.code
              : statusCode || HttpStatus.OK,
          status: options.status !== undefined ? options.status : isSuccess,
          message: options.message || (isSuccess ? 'Success' : 'Failed'),
          data: responseData,
          ...(pagination && { pagination }),
        };
      }),
    );
  }
}
