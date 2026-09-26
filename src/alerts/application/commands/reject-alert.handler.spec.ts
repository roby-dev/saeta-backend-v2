import type { EventBus } from '@nestjs/cqrs';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { StateCode } from '../../../states/domain/state-code.enum.js';
import type { AlertEntity } from '../../domain/alert.entity.js';
import type { AlertRepository } from '../../domain/alert.repository.js';
import { RejectAlertCommand } from './reject-alert.command.js';
import { RejectAlertHandler } from './reject-alert.handler.js';

describe('RejectAlertHandler', () => {
  const pendingAlert: AlertEntity = {
    id: 'alert-1',
    userId: 'citizen-1',
    latitude: -18.01,
    longitude: -70.25,
    typeId: 'type-1',
    stateId: 'state-pending',
    creationDate: '19/09/2026,10:00:00',
    state: { id: 'state-pending', name: 'Pendiente', code: StateCode.PENDING },
  };

  const mockEventBus = (): EventBus => ({ publish: vi.fn() }) as unknown as EventBus;

  const mockRepo = (alert: AlertEntity | null = pendingAlert): AlertRepository => ({
    findById: vi.fn().mockResolvedValue(alert),
    findMany: vi.fn(),
    findByUser: vi.fn(),
    findByAttendedUser: vi.fn(),
    findPendingByUser: vi.fn(),
    create: vi.fn(),
    update: vi.fn().mockImplementation((id, data) =>
      Promise.resolve({ ...alert, ...data }),
    ),
    deletePending: vi.fn(),
    getDefaultPendingStateId: vi.fn(),
    getStateCode: vi.fn(),
    findStateIdByCode: vi.fn().mockResolvedValue('state-rejected-id'),
  });

  it('rejects a pending alert: sets its state and stamps culminationDate', async () => {
    const repo = mockRepo();
    const eventBus = mockEventBus();
    const handler = new RejectAlertHandler(repo, eventBus);

    const result = await handler.execute(new RejectAlertCommand('alert-1', 'No procede'));

    expect(repo.findStateIdByCode).toHaveBeenCalledWith(StateCode.REJECTED);
    expect(result.stateId).toBe('state-rejected-id');
    expect(result.culminationDate).toBeDefined();
    expect(result.commentary).toBe('No procede');
    expect(eventBus.publish).toHaveBeenCalled();
  });

  it('throws NotFoundException when the alert does not exist', async () => {
    const repo = mockRepo(null);
    const eventBus = mockEventBus();
    const handler = new RejectAlertHandler(repo, eventBus);

    await expect(
      handler.execute(new RejectAlertCommand('missing-alert')),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('throws ConflictException when the alert state does not allow reject', async () => {
    const resolvedAlert: AlertEntity = {
      ...pendingAlert,
      state: { id: 'state-resolved', name: 'Resuelta', code: StateCode.RESOLVED },
    };
    const repo = mockRepo(resolvedAlert);
    const eventBus = mockEventBus();
    const handler = new RejectAlertHandler(repo, eventBus);

    await expect(
      handler.execute(new RejectAlertCommand('alert-1')),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(repo.update).not.toHaveBeenCalled();
  });

  it('throws NotFoundException when no state carries the REJECTED code', async () => {
    const repo = mockRepo();
    repo.findStateIdByCode = vi.fn().mockResolvedValue(null);
    const eventBus = mockEventBus();
    const handler = new RejectAlertHandler(repo, eventBus);

    await expect(
      handler.execute(new RejectAlertCommand('alert-1')),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
