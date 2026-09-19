import { Inject, Injectable } from '@nestjs/common';
import { type IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import type { TempEntity } from '../../domain/temp.entity.js';
import {
  TEMP_REPOSITORY,
  type TempRepository,
} from '../../domain/temp.repository.js';
import { GetTempsQuery } from './get-temps.query.js';

@Injectable()
@QueryHandler(GetTempsQuery)
export class GetTempsHandler
  implements IQueryHandler<GetTempsQuery, { temps: TempEntity[]; total: number }>
{
  constructor(
    @Inject(TEMP_REPOSITORY)
    private readonly tempRepository: TempRepository,
  ) {}

  async execute(): Promise<{ temps: TempEntity[]; total: number }> {
    const temps = await this.tempRepository.findAll();
    return {
      temps,
      total: temps.length,
    };
  }
}
