import type { StateCode } from './state-code.enum.js';
import type { StateEntity } from './state.entity.js';

export const STATE_REPOSITORY = Symbol('STATE_REPOSITORY');

export interface StateRepository {
  findAll(): Promise<StateEntity[]>;
  findById(id: string): Promise<StateEntity | null>;
  findByName(name: string): Promise<StateEntity | null>;
  findByCode(code: StateCode): Promise<StateEntity | null>;
  create(name: string, code?: StateCode): Promise<StateEntity>;
  update(id: string, name: string, code?: StateCode): Promise<StateEntity | null>;
}
