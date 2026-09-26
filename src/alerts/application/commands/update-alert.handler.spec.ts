import type { EventBus } from '@nestjs/cqrs';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { StateCode } from '../../../states/domain/state-code.enum.js';
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

  const mockEventBus = (): EventBus =>
    ({
      publish: vi.fn(),
    }) as unknown as EventBus;

  const mockRepo = (stateCodeByStateId: Record<string, StateCode> = {}): AlertRepository => ({
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
    getStateCode: vi.fn().mockImplementation((stateId: string) =>
      Promise.resolve(stateCodeByStateId[stateId] ?? null),
    ),
    findStateIdByCode: vi.fn(),
  });

  it('allows security personnel to attend an alert', async () => {
    const repo = mockRepo({ 'state-in-process': StateCode.IN_PROGRESS });
    const eventBus = mockEventBus();
    const handler = new UpdateAlertHandler(repo, eventBus);

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

  it('automatically stamps culminationDate when transitioning to a state coded RESOLVED', async () => {
    const repo = mockRepo({ 'state-resolved': StateCode.RESOLVED });
    const eventBus = mockEventBus();
    const handler = new UpdateAlertHandler(repo, eventBus);

    const command = new UpdateAlertCommand(
      'alert-1',
      'security-1',
      'PERSONAL_SEGURIDAD',
      { stateId: 'state-resolved' },
    );

    const result = await handler.execute(command);
    expect(result.stateId).toBe('state-resolved');
    expect(result.culminationDate).toBeDefined();
    expect(result.culminationDate).toMatch(/^\d{2}\/\d{2}\/\d{4},\d{2}:\d{2}:\d{2}$/);
    expect(eventBus.publish).toHaveBeenCalled();
  });

  it('automatically stamps culminationDate when transitioning to a state coded REJECTED', async () => {
    const repo = mockRepo({ 'state-rejected': StateCode.REJECTED });
    const eventBus = mockEventBus();
    const handler = new UpdateAlertHandler(repo, eventBus);

    const command = new UpdateAlertCommand(
      'alert-1',
      'security-1',
      'PERSONAL_SEGURIDAD',
      { stateId: 'state-rejected' },
    );

    const result = await handler.execute(command);
    expect(result.culminationDate).toBeDefined();
  });

  it('clears attendance fields when moving back to a state coded PENDING', async () => {
    const repo = mockRepo({ 'state-pending-2': StateCode.PENDING });
    const eventBus = mockEventBus();
    const handler = new UpdateAlertHandler(repo, eventBus);

    const command = new UpdateAlertCommand(
      'alert-1',
      'admin-1',
      'ADMIN',
      { stateId: 'state-pending-2' },
    );

    const result = await handler.execute(command);
    expect(result.attendedById).toBe('');
    expect(result.attentionDate).toBe('');
    expect(result.culminationDate).toBe('');
  });

  it('clears culminationDate when moving to a state coded IN_PROGRESS', async () => {
    const repo = mockRepo({ 'state-in-process': StateCode.IN_PROGRESS });
    const eventBus = mockEventBus();
    const handler = new UpdateAlertHandler(repo, eventBus);

    const command = new UpdateAlertCommand(
      'alert-1',
      'admin-1',
      'ADMIN',
      { stateId: 'state-in-process' },
    );

    const result = await handler.execute(command);
    expect(result.culminationDate).toBe('');
  });

  it('behaves by code even if the target state has been renamed', async () => {
    // The state id below intentionally has no "resolved"/"rejected"/etc. wording:
    // only its resolved StateCode drives the behavior, never its name.
    const repo = mockRepo({ 'state-64f0a1': StateCode.RESOLVED });
    const eventBus = mockEventBus();
    const handler = new UpdateAlertHandler(repo, eventBus);

    const command = new UpdateAlertCommand(
      'alert-1',
      'admin-1',
      'ADMIN',
      { stateId: 'state-64f0a1' },
    );

    const result = await handler.execute(command);
    expect(result.culminationDate).toBeDefined();
    expect(repo.getStateCode).toHaveBeenCalledWith('state-64f0a1');
  });

  it('forbids citizens from updating an alert directly', async () => {
    const repo = mockRepo();
    const eventBus = mockEventBus();
    const handler = new UpdateAlertHandler(repo, eventBus);

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
    const eventBus = mockEventBus();
    const handler = new UpdateAlertHandler(repo, eventBus);

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
