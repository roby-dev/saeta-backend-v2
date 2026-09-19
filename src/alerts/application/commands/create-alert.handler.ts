import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  NotFoundException,
} from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import {
  USER_REPOSITORY,
  type UserRepository,
} from '../../../users/domain/user.repository.js';
import type { AlertEntity } from '../../domain/alert.entity.js';
import {
  ALERT_REPOSITORY,
  type AlertRepository,
} from '../../domain/alert.repository.js';
import { CreateAlertCommand } from './create-alert.command.js';

export function getLimaFormattedDate(date: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  const lima = new Date(date.toLocaleString('en-US', { timeZone: 'America/Lima' }));
  return (
    pad(lima.getDate()) +
    '/' +
    pad(lima.getMonth() + 1) +
    '/' +
    lima.getFullYear() +
    ',' +
    pad(lima.getHours()) +
    ':' +
    pad(lima.getMinutes()) +
    ':' +
    pad(lima.getSeconds())
  );
}

@CommandHandler(CreateAlertCommand)
export class CreateAlertHandler implements ICommandHandler<CreateAlertCommand, AlertEntity> {
  constructor(
    @Inject(ALERT_REPOSITORY)
    private readonly alerts: AlertRepository,
    @Inject(USER_REPOSITORY)
    private readonly users: UserRepository,
  ) {}

  async execute(command: CreateAlertCommand): Promise<AlertEntity> {
    const privilegedRoles = ['ADMIN', 'BASE_SEGURIDAD'];
    const isPrivileged = privilegedRoles.includes(command.currentUserRole);

    const effectiveUserId =
      command.targetUserId && isPrivileged
        ? command.targetUserId
        : command.currentUserId;

    const user = await this.users.findById(effectiveUserId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.statusAccount === 'INHABILITADO') {
      throw new ForbiddenException(
        'Usted se encuentra deshabilitado, comuníquese con soporte.',
      );
    }

    const pendingAlert = await this.alerts.findPendingByUser(effectiveUserId);
    if (pendingAlert) {
      throw new ConflictException('No puede enviar más alertas por el momento');
    }

    const stateId =
      command.stateId ?? (await this.alerts.getDefaultPendingStateId());
    if (!stateId) {
      throw new BadRequestException('Initial alert state could not be determined');
    }

    const creationDate = getLimaFormattedDate();

    return this.alerts.create({
      userId: effectiveUserId,
      latitude: command.latitude,
      longitude: command.longitude,
      typeId: command.typeId,
      stateId,
      creationDate,
    });
  }
}
