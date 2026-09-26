import { ConflictException, Inject, NotFoundException } from '@nestjs/common';
import { CommandHandler, EventBus, type ICommandHandler } from '@nestjs/cqrs';
import { StateCode } from '../../../states/domain/state-code.enum.js';
import type { AlertEntity } from '../../domain/alert.entity.js';
import {
  ALERT_REPOSITORY,
  type AlertRepository,
} from '../../domain/alert.repository.js';
import { AlertUpdatedEvent } from '../../domain/events/alert-updated.event.js';
import { getAllowedActions } from '../../domain/policies/alert-action.policy.js';
import { getLimaFormattedDate } from './create-alert.handler.js';
import { DelegateAlertCommand } from './delegate-alert.command.js';

@CommandHandler(DelegateAlertCommand)
export class DelegateAlertHandler implements ICommandHandler<DelegateAlertCommand, AlertEntity> {
  constructor(
    @Inject(ALERT_REPOSITORY)
    private readonly alerts: AlertRepository,
    private readonly eventBus: EventBus,
  ) {}

  async execute(command: DelegateAlertCommand): Promise<AlertEntity> {
    const existing = await this.alerts.findById(command.alertId);
    if (!existing) {
      throw new NotFoundException('No se encontró la alerta.');
    }

    const allowedActions = getAllowedActions(existing.state?.code);
    if (!allowedActions.includes('delegate')) {
      throw new ConflictException('No se puede delegar la alerta en su estado actual.');
    }

    const inProgressStateId = await this.alerts.findStateIdByCode(StateCode.IN_PROGRESS);
    if (!inProgressStateId) {
      throw new NotFoundException('No se encontró el estado de alerta en proceso.');
    }

    const updated = await this.alerts.update(command.alertId, {
      stateId: inProgressStateId,
      attendedById: command.attendedById,
      attentionDate: getLimaFormattedDate(),
      commentary: command.commentary,
    });
    if (!updated) {
      throw new NotFoundException('No se encontró la alerta.');
    }

    this.eventBus.publish(new AlertUpdatedEvent(updated));

    return updated;
  }
}
