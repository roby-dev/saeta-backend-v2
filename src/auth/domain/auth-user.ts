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
  name?: string;
  lastname?: string;
  dni?: string;
  phone?: string;
  image?: string;
  availability?: string;
}

export interface AuthUserProfile {
  id: string;
  email: string;
  role: UserRole;
  name?: string;
  lastname?: string;
  dni?: string;
  phone?: string;
  image?: string;
  statusAccount?: string;
  availability?: string;
}
