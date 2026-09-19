import type { AccountStatus, UserEntity, UserRole } from '../../domain/user.entity.js';

export interface GetUsersResult {
  users: UserEntity[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export class GetUsersQuery {
  constructor(
    public readonly page: number = 1,
    public readonly limit: number = 10,
    public readonly role?: UserRole,
    public readonly statusAccount?: AccountStatus,
  ) {}
}
