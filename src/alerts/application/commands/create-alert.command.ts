import type { UserRole } from '../../../auth/domain/auth-user.js';

export class CreateAlertCommand {
  constructor(
    public readonly currentUserId: string,
    public readonly currentUserRole: UserRole,
    public readonly latitude: number,
    public readonly longitude: number,
    public readonly typeId: string,
    public readonly targetUserId?: string,
    public readonly stateId?: string,
  ) {}
}
