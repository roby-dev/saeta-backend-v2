import type { UserRole } from '../../../auth/domain/auth-user.js';

export class UpdateAlertFeedbackCommand {
  constructor(
    public readonly alertId: string,
    public readonly currentUserId: string,
    public readonly currentUserRole: UserRole,
    public readonly commentary?: string,
    public readonly score?: number,
  ) {}
}
