import { ConflictException, Inject } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import type { StateEntity } from '../../domain/state.entity.js';
import {
  STATE_REPOSITORY,
  type StateRepository,
} from '../../domain/state.repository.js';
import { CreateStateCommand } from './create-state.command.js';

@CommandHandler(CreateStateCommand)
export class CreateStateHandler implements ICommandHandler<CreateStateCommand, StateEntity> {
  constructor(
    @Inject(STATE_REPOSITORY)
    private readonly states: StateRepository,
  ) {}

  async execute(command: CreateStateCommand): Promise<StateEntity> {
    const existing = await this.states.findByName(command.name);
    if (existing) {
      throw new ConflictException('Estado ya registrado.');
    }

    return this.states.create(command.name);
  }
}
