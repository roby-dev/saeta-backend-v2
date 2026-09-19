import { type UserRole, userRoles } from '../../auth/domain/auth-user.js';

export { type UserRole, userRoles };

export const accountStatuses = ['HABILITADO', 'INHABILITADO'] as const;
export type AccountStatus = (typeof accountStatuses)[number];

export interface EmergencyContact {
  name: string;
  phone: string;
}

export interface UserEntity {
  id: string;
  name: string;
  lastname: string;
  dni: string;
  phone: string;
  email: string;
  role: UserRole;
  statusAccount: AccountStatus;
  image?: string;
  emergencyContacts?: EmergencyContact[];
  averageScore?: number;
  alertsAttended?: number;
  availability?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface UserWithPassword extends UserEntity {
  passwordHash: string;
}
