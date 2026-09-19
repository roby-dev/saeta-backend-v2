import {
  ConflictException,
  Inject,
  NotFoundException,
} from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import type { StateEntity } from '../../domain/state.entity.js';
import {
  STATE_REPOSITORY,
  type StateRepository,
} from '../../domain/state.repository.js';
import { UpdateStateCommand } from './update-state.command.js';

@CommandHandler(UpdateStateCommand)
export class UpdateStateHandler implements ICommandHandler<UpdateStateCommand, StateEntity> {
  constructor(
    @Inject(STATE_REPOSITORY)
    private readonly states: StateRepository,
  ) {}

  async execute(command: UpdateStateCommand): Promise<StateEntity> {
    const existing = await this.states.findById(command.stateId);
    if (!existing) {
      throw new NotFoundException('No se encontró estado de alerta.');
    }

    if (existing.name.toLowerCase() !== command.name.toLowerCase().trim()) {
      const collision = await this.states.findByName(command.name);
      if (collision && collision.id !== command.stateId) {
        throw new ConflictException('Estado ya registrado.');
      }
    }

    const updated = await this.states.update(command.stateId, command.name);
    if (!updated) {
      throw new NotFoundException('No se encontró estado de alerta.');
    }

    return updated;
  }
}
