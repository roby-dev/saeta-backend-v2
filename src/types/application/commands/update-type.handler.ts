import {
  ConflictException,
  Inject,
  NotFoundException,
} from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import type { TypeEntity } from '../../domain/type.entity.js';
import {
  TYPE_REPOSITORY,
  type TypeRepository,
} from '../../domain/type.repository.js';
import { UpdateTypeCommand } from './update-type.command.js';

@CommandHandler(UpdateTypeCommand)
export class UpdateTypeHandler implements ICommandHandler<UpdateTypeCommand, TypeEntity> {
  constructor(
    @Inject(TYPE_REPOSITORY)
    private readonly types: TypeRepository,
  ) {}

  async execute(command: UpdateTypeCommand): Promise<TypeEntity> {
    const existing = await this.types.findById(command.typeId);
    if (!existing) {
      throw new NotFoundException('No se encontró el tipo de alerta.');
    }

    if (command.name && existing.name.toLowerCase() !== command.name.toLowerCase().trim()) {
      const collision = await this.types.findByName(command.name);
      if (collision && collision.id !== command.typeId) {
        throw new ConflictException('Tipo de alerta ya registrada.');
      }
    }

    const updated = await this.types.update(
      command.typeId,
      command.name,
      command.priority,
    );

    if (!updated) {
      throw new NotFoundException('No se encontró el tipo de alerta.');
    }

    return updated;
  }
}
