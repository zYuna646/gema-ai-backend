import { Injectable, HttpStatus } from '@nestjs/common';
import { PaginationDto } from './common/dto/pagination.dto';

@Injectable()
export class AppService {
  getHello() {
    // Contoh response sederhana tanpa custom options
    return { data: 'Hello World!' };
  }

  getUsers() {
    const users = [
      { id: 1, name: 'User 1' },
      { id: 2, name: 'User 2' },
      { id: 3, name: 'User 3' },
      { id: 4, name: 'User 4' },
      { id: 5, name: 'User 5' },
    ];

    // Contoh response dengan pagination
    return PaginationDto.create(users, users.length, 1, 10);
  }

  getUser(id: number) {
    // Contoh response dengan custom message, code, dan status
    return {
      data: { id, name: `User ${id}` },
      meta: {
        options: {
          message: `Berhasil mendapatkan data user dengan id ${id}`,
          code: HttpStatus.OK,
          status: true
        }
      }
    };
  }

  getUserNotFound(id: number) {
    // Contoh response error dengan custom message, code, dan status
    return {
      data: null,
      meta: {
        options: {
          message: `User dengan id ${id} tidak ditemukan`,
          code: HttpStatus.NOT_FOUND,
          status: false
        }
      }
    };
  }
}
