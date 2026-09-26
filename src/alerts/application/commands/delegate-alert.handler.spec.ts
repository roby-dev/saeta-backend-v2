import type { EventBus } from '@nestjs/cqrs';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { StateCode } from '../../../states/domain/state-code.enum.js';
import type { AlertEntity } from '../../domain/alert.entity.js';
import type { AlertRepository } from '../../domain/alert.repository.js';
import { DelegateAlertCommand } from './delegate-alert.command.js';
import { DelegateAlertHandler } from './delegate-alert.handler.js';

describe('DelegateAlertHandler', () => {
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
    findStateIdByCode: vi.fn().mockResolvedValue('state-in-process-id'),
  });

  it('delegates a pending alert: sets attendedById, attentionDate and its state', async () => {
    const repo = mockRepo();
    const eventBus = mockEventBus();
    const handler = new DelegateAlertHandler(repo, eventBus);

    const result = await handler.execute(
      new DelegateAlertCommand('alert-1', 'security-2', 'Enviando personal'),
    );

    expect(repo.findStateIdByCode).toHaveBeenCalledWith(StateCode.IN_PROGRESS);
    expect(result.stateId).toBe('state-in-process-id');
    expect(result.attendedById).toBe('security-2');
    expect(result.attentionDate).toBeDefined();
    expect(result.commentary).toBe('Enviando personal');
    expect(eventBus.publish).toHaveBeenCalled();
  });

  it('throws NotFoundException when the alert does not exist', async () => {
    const repo = mockRepo(null);
    const eventBus = mockEventBus();
    const handler = new DelegateAlertHandler(repo, eventBus);

    await expect(
      handler.execute(new DelegateAlertCommand('missing-alert', 'security-2')),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('throws ConflictException when the alert state does not allow delegate', async () => {
    const resolvedAlert: AlertEntity = {
      ...pendingAlert,
      state: { id: 'state-resolved', name: 'Resuelta', code: StateCode.RESOLVED },
    };
    const repo = mockRepo(resolvedAlert);
    const eventBus = mockEventBus();
    const handler = new DelegateAlertHandler(repo, eventBus);

    await expect(
      handler.execute(new DelegateAlertCommand('alert-1', 'security-2')),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(repo.update).not.toHaveBeenCalled();
  });

  it('throws NotFoundException when no state carries the IN_PROGRESS code', async () => {
    const repo = mockRepo();
    repo.findStateIdByCode = vi.fn().mockResolvedValue(null);
    const eventBus = mockEventBus();
    const handler = new DelegateAlertHandler(repo, eventBus);

    await expect(
      handler.execute(new DelegateAlertCommand('alert-1', 'security-2')),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
