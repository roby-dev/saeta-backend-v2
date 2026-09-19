import type { UserRole } from '../../../auth/domain/auth-user.js';

export class GetAlertsByAttendedUserQuery {
  constructor(
    public readonly attendedUserId: string,
    public readonly currentUserId: string,
    public readonly currentUserRole: UserRole,
  ) {}
}
