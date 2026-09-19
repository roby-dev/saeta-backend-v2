import type { StateEntity } from './state.entity.js';

export const STATE_REPOSITORY = Symbol('STATE_REPOSITORY');

export interface StateRepository {
  findAll(): Promise<StateEntity[]>;
  findById(id: string): Promise<StateEntity | null>;
  findByName(name: string): Promise<StateEntity | null>;
  create(name: string): Promise<StateEntity>;
  update(id: string, name: string): Promise<StateEntity | null>;
}
