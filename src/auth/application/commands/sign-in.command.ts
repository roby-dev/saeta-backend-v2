import type { AuthUserProfile, UserRole } from '../../domain/auth-user.js';

export class SignInCommand {
  constructor(
    readonly email: string,
    readonly password: string,
  ) {}
}

export interface SignInResult {
  accessToken: string;
  user: AuthUserProfile;
}

export interface AccessTokenPayload {
  sub: string;
  email: string;
  role: UserRole;
}
