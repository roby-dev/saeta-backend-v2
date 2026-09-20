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
import { UpdateAlertFeedbackCommand } from './update-alert-feedback.command.js';

@CommandHandler(UpdateAlertFeedbackCommand)
export class UpdateAlertFeedbackHandler
  implements ICommandHandler<UpdateAlertFeedbackCommand, AlertEntity>
{
  constructor(
    @Inject(ALERT_REPOSITORY)
    private readonly alerts: AlertRepository,
    private readonly eventBus: EventBus,
  ) {}

  async execute(command: UpdateAlertFeedbackCommand): Promise<AlertEntity> {
    const alert = await this.alerts.findById(command.alertId);
    if (!alert) {
      throw new NotFoundException('No se encontró la alerta.');
    }

    const isOwner = alert.userId === command.currentUserId;
    const isAdmin = command.currentUserRole === 'ADMIN';

    if (!isOwner && !isAdmin) {
      throw new ForbiddenException('No tiene permisos para calificar esta alerta');
    }

    const updated = await this.alerts.update(command.alertId, {
      commentary: command.commentary,
      score: command.score,
    });

    if (!updated) {
      throw new NotFoundException('No se encontró la alerta.');
    }

    this.eventBus.publish(new AlertUpdatedEvent(updated));

    return updated;
  }
}
