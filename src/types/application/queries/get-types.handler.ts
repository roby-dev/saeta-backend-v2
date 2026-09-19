import { Inject } from '@nestjs/common';
import { type IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import type { TypeEntity } from '../../domain/type.entity.js';
import {
  TYPE_REPOSITORY,
  type TypeRepository,
} from '../../domain/type.repository.js';
import { GetTypesQuery } from './get-types.query.js';

@QueryHandler(GetTypesQuery)
export class GetTypesHandler
  implements IQueryHandler<GetTypesQuery, { types: TypeEntity[]; total: number }>
{
  constructor(
    @Inject(TYPE_REPOSITORY)
    private readonly types: TypeRepository,
  ) {}

  async execute(
    query: GetTypesQuery,
  ): Promise<{ types: TypeEntity[]; total: number }> {
    return this.types.findAll(query.skip, query.limit);
  }
}
