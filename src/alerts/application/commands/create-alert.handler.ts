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

const limaDateTimeFormatter = new Intl.DateTimeFormat('es-PE', {
  timeZone: 'America/Lima',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
});

export function getLimaFormattedDate(date: Date = new Date()): string {
  const parts = limaDateTimeFormatter.formatToParts(date);
  const map: Record<string, string> = {};
  for (const part of parts) {
    map[part.type] = part.value;
  }
  return `${map.day}/${map.month}/${map.year},${map.hour}:${map.minute}:${map.second}`;
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
