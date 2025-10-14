import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  handleRequest(
    err: any,
    user: any,
    info: any,
    context: ExecutionContext,
    status?: any,
  ) {
    console.log('JWT Auth Debug Info:');
    console.log('Error:', err);
    console.log('User:', user);
    console.log('Info:', info);
    console.log('Status:', status);

    if (err) {
      console.error('JWT Auth Error:', err.message);
    }

    if (info) {
      console.log('JWT Auth Info:', info.message);
    }

    return super.handleRequest(err, user, info, context, status);
  }
}
