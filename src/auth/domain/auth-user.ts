export const userRoles = [
  'ADMIN',
  'BASE_SEGURIDAD',
  'PERSONAL_SEGURIDAD',
  'CIUDADANO',
] as const;

export type UserRole = (typeof userRoles)[number];

export interface AuthUser {
  id: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  statusAccount: string;
}

export interface AuthUserProfile {
  id: string;
  email: string;
  role: UserRole;
}
