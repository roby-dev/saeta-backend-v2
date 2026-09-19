import { Inject, Injectable } from '@nestjs/common';
import { type IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import type { TempEntity } from '../../domain/temp.entity.js';
import {
  TEMP_REPOSITORY,
  type TempRepository,
} from '../../domain/temp.repository.js';
import { GetTempByUserQuery } from './get-temp-by-user.query.js';

@Injectable()
@QueryHandler(GetTempByUserQuery)
export class GetTempByUserHandler
  implements IQueryHandler<GetTempByUserQuery, TempEntity | null>
{
  constructor(
    @Inject(TEMP_REPOSITORY)
    private readonly tempRepository: TempRepository,
  ) {}

  async execute(query: GetTempByUserQuery): Promise<TempEntity | null> {
    return this.tempRepository.findByUser(query.userId);
  }
}
