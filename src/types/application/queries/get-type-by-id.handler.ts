import { Inject, NotFoundException } from '@nestjs/common';
import { type IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import type { TypeEntity } from '../../domain/type.entity.js';
import {
  TYPE_REPOSITORY,
  type TypeRepository,
} from '../../domain/type.repository.js';
import { GetTypeByIdQuery } from './get-type-by-id.query.js';

@QueryHandler(GetTypeByIdQuery)
export class GetTypeByIdHandler
  implements IQueryHandler<GetTypeByIdQuery, TypeEntity>
{
  constructor(
    @Inject(TYPE_REPOSITORY)
    private readonly types: TypeRepository,
  ) {}

  async execute(query: GetTypeByIdQuery): Promise<TypeEntity> {
    const type = await this.types.findById(query.typeId);
    if (!type) {
      throw new NotFoundException('No se encontró el tipo de alerta.');
    }
    return type;
  }
}
