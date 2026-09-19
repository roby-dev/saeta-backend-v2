import { Inject, NotFoundException } from '@nestjs/common';
import { type IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import type { AlertEntity } from '../../domain/alert.entity.js';
import {
  ALERT_REPOSITORY,
  type AlertRepository,
} from '../../domain/alert.repository.js';
import { GetAlertByIdQuery } from './get-alert-by-id.query.js';

@QueryHandler(GetAlertByIdQuery)
export class GetAlertByIdHandler implements IQueryHandler<GetAlertByIdQuery, AlertEntity> {
  constructor(
    @Inject(ALERT_REPOSITORY)
    private readonly alerts: AlertRepository,
  ) {}

  async execute(query: GetAlertByIdQuery): Promise<AlertEntity> {
    const alert = await this.alerts.findById(query.alertId);
    if (!alert) {
      throw new NotFoundException('No se encontró la alerta.');
    }
    return alert;
  }
}
