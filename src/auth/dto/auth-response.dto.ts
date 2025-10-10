import { Permission } from 'src/permissions/entities/permission.entity';
import { Role } from 'src/roles/entities/role.entity';
import { User } from 'src/users/entities/user.entity';

export class AuthResponseDto {
  user: {
    id: string;
    name: string;
    email: string;
    role: Role;
    permissions: Permission[];
  };
  accessToken: string;
}
