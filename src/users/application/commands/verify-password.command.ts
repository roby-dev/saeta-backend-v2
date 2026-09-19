import type { UserRole } from '../../domain/user.entity.js';

export class VerifyPasswordCommand {
  constructor(
    public readonly targetUserId: string,
    public readonly currentUserId: string,
    public readonly currentUserRole: UserRole,
    public readonly password: string,
  ) {}
}
