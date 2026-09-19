import type { UserRole } from '../../../auth/domain/auth-user.js';

export class DeletePendingAlertsCommand {
  constructor(
    public readonly currentUserId: string,
    public readonly currentUserRole: UserRole,
  ) {}
}
