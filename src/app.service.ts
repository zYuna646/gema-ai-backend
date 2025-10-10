import { Injectable, HttpStatus } from '@nestjs/common';
import { PaginationDto } from './common/dto/pagination.dto';

@Injectable()
export class AppService {
  getHello() {
    // Contoh response sederhana tanpa custom options
    return { data: 'Hello World!' };
  }
}
