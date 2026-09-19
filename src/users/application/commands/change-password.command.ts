import type { UserRole } from '../../domain/user.entity.js';

export class ChangePasswordCommand {
  constructor(
    public readonly targetUserId: string,
    public readonly currentUserId: string,
    public readonly currentUserRole: UserRole,
    public readonly newPassword: string,
    public readonly currentPassword?: string,
  ) {}
}
