import { ForbiddenException, Inject } from '@nestjs/common';
import { type IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import type { AlertEntity } from '../../domain/alert.entity.js';
import {
  ALERT_REPOSITORY,
  type AlertRepository,
} from '../../domain/alert.repository.js';
import { GetAlertsByUserQuery } from './get-alerts-by-user.query.js';

@QueryHandler(GetAlertsByUserQuery)
export class GetAlertsByUserHandler
  implements IQueryHandler<GetAlertsByUserQuery, { alerts: AlertEntity[]; total: number }>
{
  constructor(
    @Inject(ALERT_REPOSITORY)
    private readonly alerts: AlertRepository,
  ) {}

  async execute(
    query: GetAlertsByUserQuery,
  ): Promise<{ alerts: AlertEntity[]; total: number }> {
    const isOwner = query.targetUserId === query.currentUserId;
    const privilegedRoles = ['ADMIN', 'BASE_SEGURIDAD'];
    const isPrivileged = privilegedRoles.includes(query.currentUserRole);

    if (!isOwner && !isPrivileged) {
      throw new ForbiddenException('No tiene permisos para ver estas alertas');
    }

    return this.alerts.findByUser(query.targetUserId);
  }
}
