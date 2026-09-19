import type { TypeEntity } from './type.entity.js';

export const TYPE_REPOSITORY = Symbol('TYPE_REPOSITORY');

export interface TypeRepository {
  findAll(skip?: number, limit?: number): Promise<{ types: TypeEntity[]; total: number }>;
  findById(id: string): Promise<TypeEntity | null>;
  findByName(name: string): Promise<TypeEntity | null>;
  create(name: string, priority?: number): Promise<TypeEntity>;
  update(id: string, name?: string, priority?: number): Promise<TypeEntity | null>;
}
