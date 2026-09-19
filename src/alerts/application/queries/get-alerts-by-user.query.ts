import type { UserRole } from '../../../auth/domain/auth-user.js';

export class GetAlertsByUserQuery {
  constructor(
    public readonly targetUserId: string,
    public readonly currentUserId: string,
    public readonly currentUserRole: UserRole,
  ) {}
}
