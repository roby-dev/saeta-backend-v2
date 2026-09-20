import {
  ForbiddenException,
  Inject,
  NotFoundException,
} from '@nestjs/common';
import { CommandHandler, EventBus, type ICommandHandler } from '@nestjs/cqrs';
import { AlertUpdatedEvent } from '../../domain/events/alert-updated.event.js';
import type { AlertEntity } from '../../domain/alert.entity.js';
import {
  ALERT_REPOSITORY,
  type AlertRepository,
} from '../../domain/alert.repository.js';
import { getLimaFormattedDate } from './create-alert.handler.js';
import { UpdateAlertCommand } from './update-alert.command.js';

@CommandHandler(UpdateAlertCommand)
export class UpdateAlertHandler implements ICommandHandler<UpdateAlertCommand, AlertEntity> {
  constructor(
    @Inject(ALERT_REPOSITORY)
    private readonly alerts: AlertRepository,
    private readonly eventBus: EventBus,
  ) {}

  async execute(command: UpdateAlertCommand): Promise<AlertEntity> {
    const existing = await this.alerts.findById(command.alertId);
    if (!existing) {
      throw new NotFoundException('No se encontró la alerta.');
    }

    const authorizedRoles = ['ADMIN', 'BASE_SEGURIDAD', 'PERSONAL_SEGURIDAD'];
    if (!authorizedRoles.includes(command.currentUserRole)) {
      throw new ForbiddenException('No tiene permisos para modificar esta alerta');
    }

    const payload = { ...command.data };

    // Auto-fill attention details if moving to active state by security personnel
    if (payload.stateId && !payload.attendedById && command.currentUserRole === 'PERSONAL_SEGURIDAD') {
      payload.attendedById = command.currentUserId;
    }
    if (payload.attendedById && !payload.attentionDate) {
      payload.attentionDate = getLimaFormattedDate();
    }

    // Auto-fill culminationDate if moving to terminal state (Resuelta, Rechazada, Cancelada)
    if (payload.stateId) {
      const stateName = await this.alerts.getStateName(payload.stateId);
      if (stateName) {
        const upper = stateName.toUpperCase();
        const isTerminal =
          upper.includes('RESUELT') ||
          upper.includes('RECHAZAD') ||
          upper.includes('CANCELAD');

        if (isTerminal && !payload.culminationDate) {
          payload.culminationDate = getLimaFormattedDate();
        } else if (!isTerminal && upper.includes('PROCESO') && payload.culminationDate === undefined) {
          payload.culminationDate = '';
        }
      }
    }


    const updated = await this.alerts.update(command.alertId, payload);
    if (!updated) {
      throw new NotFoundException('No se encontró la alerta.');
    }

    this.eventBus.publish(new AlertUpdatedEvent(updated));

    return updated;
  }
}
