import type {
  AccountStatus,
  EmergencyContact,
  UserEntity,
  UserRole,
  UserWithPassword,
} from './user.entity.js';

export const USER_REPOSITORY = Symbol('USER_REPOSITORY');

export interface CreateUserData {
  name: string;
  lastname: string;
  dni: string;
  phone: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  statusAccount?: AccountStatus;
  image?: string;
  emergencyContacts?: EmergencyContact[];
}

export interface UpdateUserData {
  name?: string;
  lastname?: string;
  phone?: string;
  email?: string;
  image?: string;
  emergencyContacts?: EmergencyContact[];
  statusAccount?: AccountStatus;
  availability?: string;
}

export interface FindUsersFilter {
  role?: UserRole;
  statusAccount?: AccountStatus;
  search?: string;
  skip?: number;
  limit?: number;
}

export interface PaginatedUsers {
  users: UserEntity[];
  total: number;
  counts?: {
    total: number;
    admin: number;
    baseSecurity: number;
    securityPersonnel: number;
    citizen: number;
    enabled: number;
    disabled: number;
  };
}

export interface UserRepository {
  findById(id: string): Promise<UserEntity | null>;
  findByIdWithPassword(id: string): Promise<UserWithPassword | null>;
  findByEmail(email: string): Promise<UserEntity | null>;
  findByDni(dni: string): Promise<UserEntity | null>;
  findByPhone(phone: string): Promise<UserEntity | null>;
  findMany(filter: FindUsersFilter): Promise<PaginatedUsers>;
  findSecurityPersonnel(): Promise<UserEntity[]>;
  create(data: CreateUserData): Promise<UserEntity>;
  update(id: string, data: UpdateUserData): Promise<UserEntity | null>;
  updatePassword(id: string, passwordHash: string): Promise<boolean>;
}
