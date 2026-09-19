import type { UserRole } from '../../../auth/domain/auth-user.js';

export class UpdateAlertCommand {
  constructor(
    public readonly alertId: string,
    public readonly currentUserId: string,
    public readonly currentUserRole: UserRole,
    public readonly data: {
      stateId?: string;
      attendedById?: string;
      attentionDate?: string;
      culminationDate?: string;
      commentary?: string;
      score?: number;
    },
  ) {}
}
