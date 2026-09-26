import type { EventBus } from '@nestjs/cqrs';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import type { AlertEntity } from '../../domain/alert.entity.js';
import type { AlertRepository } from '../../domain/alert.repository.js';
import { UpdateAlertFeedbackCommand } from './update-alert-feedback.command.js';
import { UpdateAlertFeedbackHandler } from './update-alert-feedback.handler.js';

describe('UpdateAlertFeedbackHandler', () => {
  const existingAlert: AlertEntity = {
    id: 'alert-1',
    userId: 'citizen-1',
    latitude: -18.01,
    longitude: -70.25,
    typeId: 'type-1',
    stateId: 'state-resolved',
    creationDate: '19/09/2026,10:00:00',
  };

  const mockEventBus = (): EventBus =>
    ({
      publish: vi.fn(),
    }) as unknown as EventBus;

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
    getStateCode: vi.fn(),
    findStateIdByCode: vi.fn(),
  });

  it('allows citizen owner to rate and comment on attended alert', async () => {
    const repo = mockRepo();
    const eventBus = mockEventBus();
    const handler = new UpdateAlertFeedbackHandler(repo, eventBus);

    const command = new UpdateAlertFeedbackCommand(
      'alert-1',
      'citizen-1',
      'CIUDADANO',
      'Excelente atención rápida',
      5,
    );

    const result = await handler.execute(command);
    expect(result.commentary).toBe('Excelente atención rápida');
    expect(result.score).toBe(5);
    expect(eventBus.publish).toHaveBeenCalled();
  });

  it('forbids stranger citizen from rating someone else alert', async () => {
    const repo = mockRepo();
    const eventBus = mockEventBus();
    const handler = new UpdateAlertFeedbackHandler(repo, eventBus);

    const command = new UpdateAlertFeedbackCommand(
      'alert-1',
      'stranger-1',
      'CIUDADANO',
      'Bad',
      1,
    );

    await expect(handler.execute(command)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('throws NotFoundException if alert does not exist', async () => {
    const repo = mockRepo();
    repo.findById = vi.fn().mockResolvedValue(null);
    const eventBus = mockEventBus();
    const handler = new UpdateAlertFeedbackHandler(repo, eventBus);

    const command = new UpdateAlertFeedbackCommand(
      'missing-alert',
      'citizen-1',
      'CIUDADANO',
      'Feedback',
      4,
    );

    await expect(handler.execute(command)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
