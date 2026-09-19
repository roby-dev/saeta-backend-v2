import type { AuthUserProfile, UserRole } from '../../domain/auth-user.js';

export class RefreshTokenCommand {
  constructor(readonly refreshToken: string) {}
}

export interface RefreshTokenResult {
  accessToken: string;
  refreshToken: string;
  user: AuthUserProfile;
}

export interface RefreshTokenPayload {
  sub: string;
  email: string;
  role: UserRole;
  tokenType: 'refresh';
}
