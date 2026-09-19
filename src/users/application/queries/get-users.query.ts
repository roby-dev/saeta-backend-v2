import type { AccountStatus, UserEntity, UserRole } from '../../domain/user.entity.js';

export interface UserCountsSummary {
  total: number;
  admin: number;
  baseSecurity: number;
  securityPersonnel: number;
  citizen: number;
  enabled: number;
  disabled: number;
}

export interface GetUsersResult {
  users: UserEntity[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  counts?: UserCountsSummary;
}

export class GetUsersQuery {
  constructor(
    public readonly page: number = 1,
    public readonly limit: number = 10,
    public readonly role?: UserRole,
    public readonly statusAccount?: AccountStatus,
    public readonly search?: string,
  ) {}
}

