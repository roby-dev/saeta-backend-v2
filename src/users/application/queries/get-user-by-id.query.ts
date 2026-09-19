import type { UserRole } from '../../domain/user.entity.js';

export class GetUserByIdQuery {
  constructor(
    public readonly targetUserId: string,
    public readonly currentUserId: string,
    public readonly currentUserRole: UserRole,
  ) {}
}
