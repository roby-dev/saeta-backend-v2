import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import type { AlertEntity } from '../../domain/alert.entity.js';
import type { AlertRepository } from '../../domain/alert.repository.js';
import { UpdateAlertCommand } from './update-alert.command.js';
import { UpdateAlertHandler } from './update-alert.handler.js';

describe('UpdateAlertHandler', () => {
  const existingAlert: AlertEntity = {
    id: 'alert-1',
    userId: 'citizen-1',
    latitude: -18.01,
    longitude: -70.25,
    typeId: 'type-1',
    stateId: 'state-pending',
    creationDate: '19/09/2026,10:00:00',
  };

  const mockRepo = (): AlertRepository => ({
    findById: vi.fn().mockResolvedValue(existingAlert),
    findMany: vi.fn(),
    findByUser: vi.fn(),
    findByAttendedUser: vi.fn(),
    findPendingByUser: vi.fn(),
    create: vi.fn(),
    update: vi.fn().mockImplementation((id, data) =>
      Promise.resolve({ ...existingAlert, ...data }),
    ),
    deletePending: vi.fn(),
    getDefaultPendingStateId: vi.fn(),
  });

  it('allows security personnel to attend an alert', async () => {
    const repo = mockRepo();
    const handler = new UpdateAlertHandler(repo);

    const command = new UpdateAlertCommand(
      'alert-1',
      'security-1',
      'PERSONAL_SEGURIDAD',
      { stateId: 'state-in-process' },
    );

    const result = await handler.execute(command);
    expect(result.stateId).toBe('state-in-process');
    expect(result.attendedById).toBe('security-1');
    expect(result.attentionDate).toBeDefined();
  });

  it('forbids citizens from updating an alert directly', async () => {
    const repo = mockRepo();
    const handler = new UpdateAlertHandler(repo);

    const command = new UpdateAlertCommand(
      'alert-1',
      'citizen-1',
      'CIUDADANO',
      { stateId: 'state-in-process' },
    );

    await expect(handler.execute(command)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('throws NotFoundException if alert does not exist', async () => {
    const repo = mockRepo();
    repo.findById = vi.fn().mockResolvedValue(null);
    const handler = new UpdateAlertHandler(repo);

    const command = new UpdateAlertCommand(
      'missing-alert',
      'admin-1',
      'ADMIN',
      { stateId: 'state-resolved' },
    );

    await expect(handler.execute(command)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
