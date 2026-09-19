import { Inject } from '@nestjs/common';
import { type IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import type { StateEntity } from '../../domain/state.entity.js';
import {
  STATE_REPOSITORY,
  type StateRepository,
} from '../../domain/state.repository.js';
import { GetStatesQuery } from './get-states.query.js';

@QueryHandler(GetStatesQuery)
export class GetStatesHandler
  implements IQueryHandler<GetStatesQuery, { states: StateEntity[]; total: number }>
{
  constructor(
    @Inject(STATE_REPOSITORY)
    private readonly states: StateRepository,
  ) {}

  async execute(): Promise<{ states: StateEntity[]; total: number }> {
    const list = await this.states.findAll();
    return {
      states: list,
      total: list.length,
    };
  }
}
