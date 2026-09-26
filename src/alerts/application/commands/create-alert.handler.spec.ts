import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import type { EventBus } from '@nestjs/cqrs';
import type { UserEntity } from '../../../users/domain/user.entity.js';
import type { UserRepository } from '../../../users/domain/user.repository.js';
import type { AlertRepository } from '../../domain/alert.repository.js';
import { CreateAlertCommand } from './create-alert.command.js';
import { CreateAlertHandler } from './create-alert.handler.js';

describe('CreateAlertHandler', () => {
  const activeUser: UserEntity = {
    id: 'user-1',
    name: 'Carlos',
    lastname: 'Perez',
    dni: '12345678',
    phone: '987654321',
    email: 'carlos@saeta.test',
    role: 'CIUDADANO',
    statusAccount: 'HABILITADO',
  };

  const mockEventBus = (): EventBus =>
    ({
      publish: vi.fn(),
    }) as unknown as EventBus;

  const mockUsersRepo = (user: UserEntity | null = activeUser): UserRepository => ({
    findById: vi.fn().mockResolvedValue(user),
    findByIdWithPassword: vi.fn(),
    findByEmail: vi.fn(),
    findByDni: vi.fn(),
    findByPhone: vi.fn(),
    findMany: vi.fn(),
    findSecurityPersonnel: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    updatePassword: vi.fn(),
  });

  const mockAlertsRepo = (): AlertRepository => ({
    findById: vi.fn(),
    findMany: vi.fn(),
    findByUser: vi.fn(),
    findByAttendedUser: vi.fn(),
    findPendingByUser: vi.fn().mockResolvedValue(null),
    create: vi.fn().mockImplementation((data) =>
      Promise.resolve({
        id: 'alert-1',
        ...data,
      }),
    ),
    update: vi.fn(),
    deletePending: vi.fn(),
    getDefaultPendingStateId: vi.fn().mockResolvedValue('state-pending-1'),
    getStateCode: vi.fn(),
    findStateIdByCode: vi.fn(),
  });

  it('creates an alert for an active citizen without pending alerts', async () => {
    const usersRepo = mockUsersRepo();
    const alertsRepo = mockAlertsRepo();
    const eventBus = mockEventBus();
    const handler = new CreateAlertHandler(alertsRepo, usersRepo, eventBus);

    const command = new CreateAlertCommand(
      'user-1',
      'CIUDADANO',
      -18.01,
      -70.25,
      'type-1',
    );

    const result = await handler.execute(command);
    expect(result.id).toBe('alert-1');
    expect(result.userId).toBe('user-1');
    expect(alertsRepo.create).toHaveBeenCalled();
    expect(eventBus.publish).toHaveBeenCalled();
  });

  it('rejects alert creation if user is INHABILITADO', async () => {
    const disabledUser = { ...activeUser, statusAccount: 'INHABILITADO' as const };
    const usersRepo = mockUsersRepo(disabledUser);
    const alertsRepo = mockAlertsRepo();
    const eventBus = mockEventBus();
    const handler = new CreateAlertHandler(alertsRepo, usersRepo, eventBus);

    const command = new CreateAlertCommand(
      'user-1',
      'CIUDADANO',
      -18.01,
      -70.25,
      'type-1',
    );

    await expect(handler.execute(command)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('rejects alert creation if user already has a pending alert', async () => {
    const usersRepo = mockUsersRepo();
    const alertsRepo = mockAlertsRepo();
    const eventBus = mockEventBus();
    alertsRepo.findPendingByUser = vi.fn().mockResolvedValue({ id: 'existing-pending' } as never);
    const handler = new CreateAlertHandler(alertsRepo, usersRepo, eventBus);

    const command = new CreateAlertCommand(
      'user-1',
      'CIUDADANO',
      -18.01,
      -70.25,
      'type-1',
    );

    await expect(handler.execute(command)).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('throws NotFoundException if user does not exist', async () => {
    const usersRepo = mockUsersRepo(null);
    const alertsRepo = mockAlertsRepo();
    const eventBus = mockEventBus();
    const handler = new CreateAlertHandler(alertsRepo, usersRepo, eventBus);

    const command = new CreateAlertCommand(
      'missing-user',
      'CIUDADANO',
      -18.01,
      -70.25,
      'type-1',
    );

    await expect(handler.execute(command)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
