import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { type IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import type { TempEntity } from '../../domain/temp.entity.js';
import {
  TEMP_REPOSITORY,
  type TempRepository,
} from '../../domain/temp.repository.js';
import { GetTempByIdQuery } from './get-temp-by-id.query.js';

@Injectable()
@QueryHandler(GetTempByIdQuery)
export class GetTempByIdHandler
  implements IQueryHandler<GetTempByIdQuery, TempEntity>
{
  constructor(
    @Inject(TEMP_REPOSITORY)
    private readonly tempRepository: TempRepository,
  ) {}

  async execute(query: GetTempByIdQuery): Promise<TempEntity> {
    const temp = await this.tempRepository.findById(query.id);
    if (!temp) {
      throw new NotFoundException(`Temporary record with ID ${query.id} not found`);
    }
    return temp;
  }
}
