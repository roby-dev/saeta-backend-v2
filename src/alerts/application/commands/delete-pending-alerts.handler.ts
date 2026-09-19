import { ForbiddenException, Inject } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import {
  ALERT_REPOSITORY,
  type AlertRepository,
} from '../../domain/alert.repository.js';
import { DeletePendingAlertsCommand } from './delete-pending-alerts.command.js';

@CommandHandler(DeletePendingAlertsCommand)
export class DeletePendingAlertsHandler
  implements ICommandHandler<DeletePendingAlertsCommand, { deletedCount: number }>
{
  constructor(
    @Inject(ALERT_REPOSITORY)
    private readonly alerts: AlertRepository,
  ) {}

  async execute(
    command: DeletePendingAlertsCommand,
  ): Promise<{ deletedCount: number }> {
    const authorizedRoles = ['ADMIN', 'BASE_SEGURIDAD'];
    if (!authorizedRoles.includes(command.currentUserRole)) {
      throw new ForbiddenException('No tiene permisos para eliminar alertas pendientes');
    }

    const count = await this.alerts.deletePending();
    return { deletedCount: count };
  }
}
