import { ForbiddenException, Inject } from '@nestjs/common';
import { type IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import type { AlertEntity } from '../../domain/alert.entity.js';
import {
  ALERT_REPOSITORY,
  type AlertRepository,
} from '../../domain/alert.repository.js';
import { GetAlertsByAttendedUserQuery } from './get-alerts-by-attended-user.query.js';

@QueryHandler(GetAlertsByAttendedUserQuery)
export class GetAlertsByAttendedUserHandler
  implements
    IQueryHandler<
      GetAlertsByAttendedUserQuery,
      { alerts: AlertEntity[]; total: number }
    >
{
  constructor(
    @Inject(ALERT_REPOSITORY)
    private readonly alerts: AlertRepository,
  ) {}

  async execute(
    query: GetAlertsByAttendedUserQuery,
  ): Promise<{ alerts: AlertEntity[]; total: number }> {
    const isAttendedSelf = query.attendedUserId === query.currentUserId;
    const privilegedRoles = ['ADMIN', 'BASE_SEGURIDAD'];
    const isPrivileged = privilegedRoles.includes(query.currentUserRole);

    if (!isAttendedSelf && !isPrivileged) {
      throw new ForbiddenException('No tiene permisos para ver estas alertas');
    }

    return this.alerts.findByAttendedUser(query.attendedUserId);
  }
}
