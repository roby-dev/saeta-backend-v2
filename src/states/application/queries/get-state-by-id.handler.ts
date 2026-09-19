import { Inject, NotFoundException } from '@nestjs/common';
import { type IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import type { StateEntity } from '../../domain/state.entity.js';
import {
  STATE_REPOSITORY,
  type StateRepository,
} from '../../domain/state.repository.js';
import { GetStateByIdQuery } from './get-state-by-id.query.js';

@QueryHandler(GetStateByIdQuery)
export class GetStateByIdHandler
  implements IQueryHandler<GetStateByIdQuery, StateEntity>
{
  constructor(
    @Inject(STATE_REPOSITORY)
    private readonly states: StateRepository,
  ) {}

  async execute(query: GetStateByIdQuery): Promise<StateEntity> {
    const state = await this.states.findById(query.stateId);
    if (!state) {
      throw new NotFoundException('No se encontró estado de alerta.');
    }
    return state;
  }
}
