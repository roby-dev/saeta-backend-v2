import { ConflictException, Inject } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import type { TypeEntity } from '../../domain/type.entity.js';
import {
  TYPE_REPOSITORY,
  type TypeRepository,
} from '../../domain/type.repository.js';
import { CreateTypeCommand } from './create-type.command.js';

@CommandHandler(CreateTypeCommand)
export class CreateTypeHandler implements ICommandHandler<CreateTypeCommand, TypeEntity> {
  constructor(
    @Inject(TYPE_REPOSITORY)
    private readonly types: TypeRepository,
  ) {}

  async execute(command: CreateTypeCommand): Promise<TypeEntity> {
    const existing = await this.types.findByName(command.name);
    if (existing) {
      throw new ConflictException('Tipo de alerta ya registrada.');
    }

    return this.types.create(command.name, command.priority ?? 0);
  }
}
