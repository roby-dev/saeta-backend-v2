import { Inject } from '@nestjs/common';
import { type IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import {
  ALERT_REPOSITORY,
  type AlertRepository,
} from '../../domain/alert.repository.js';
import { GetAlertsQuery, type GetAlertsResult } from './get-alerts.query.js';

@QueryHandler(GetAlertsQuery)
export class GetAlertsHandler implements IQueryHandler<GetAlertsQuery, GetAlertsResult> {
  constructor(
    @Inject(ALERT_REPOSITORY)
    private readonly alerts: AlertRepository,
  ) {}

  async execute(query: GetAlertsQuery): Promise<GetAlertsResult> {
    const page = Math.max(1, query.page);
    const limit = Math.max(1, Math.min(100, query.limit));
    const skip = (page - 1) * limit;

    const { alerts, total, stateCounts } = await this.alerts.findMany({
      stateId: query.stateId,
      typeId: query.typeId,
      skip,
      limit,
    });

    return {
      alerts,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      stateCounts,
    };
  }
}

