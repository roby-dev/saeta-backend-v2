import type { AuthUserProfile } from '../../domain/auth-user.js';

export class GetCurrentUserQuery {
  constructor(readonly userId: string) {}
}

export type GetCurrentUserResult = AuthUserProfile;
