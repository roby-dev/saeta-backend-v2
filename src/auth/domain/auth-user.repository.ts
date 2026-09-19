import type { AuthUser, AuthUserProfile } from './auth-user.js';

export const AUTH_USER_REPOSITORY = Symbol('AUTH_USER_REPOSITORY');

export interface AuthUserRepository {
  findByEmail(email: string): Promise<AuthUser | null>;
  findProfileById(id: string): Promise<AuthUserProfile | null>;
}
