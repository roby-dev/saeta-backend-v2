import type { TempEntity } from './temp.entity.js';

export const TEMP_REPOSITORY = Symbol('TEMP_REPOSITORY');

export interface TempRepository {
  findAll(): Promise<TempEntity[]>;
  findByUser(userId: string): Promise<TempEntity | null>;
  findById(id: string): Promise<TempEntity | null>;
  create(data: {
    userId: string;
    tempPassword: string;
    date: string;
  }): Promise<TempEntity>;
  delete(id: string): Promise<boolean>;
}
