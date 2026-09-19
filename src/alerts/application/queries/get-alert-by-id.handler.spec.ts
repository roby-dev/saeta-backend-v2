import { NotFoundException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import type { AlertEntity } from '../../domain/alert.entity.js';
import type { AlertRepository } from '../../domain/alert.repository.js';
import { GetAlertByIdHandler } from './get-alert-by-id.handler.js';
import { GetAlertByIdQuery } from './get-alert-by-id.query.js';

describe('GetAlertByIdHandler', () => {
  const mockAlert: AlertEntity = {
    id: 'alert-1',
    userId: 'user-1',
    latitude: -18.01,
    longitude: -70.25,
    typeId: 'type-1',
    stateId: 'state-1',
    creationDate: '19/09/2026,10:00:00',
  };

  const mockRepo = (): AlertRepository => ({
    findById: vi.fn().mockResolvedValue(mockAlert),
    findMany: vi.fn(),
    findByUser: vi.fn(),
    findByAttendedUser: vi.fn(),
    findPendingByUser: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    deletePending: vi.fn(),
    getDefaultPendingStateId: vi.fn(),
  });

  it('retrieves an alert by its ID', async () => {
    const repo = mockRepo();
    const handler = new GetAlertByIdHandler(repo);

    const result = await handler.execute(new GetAlertByIdQuery('alert-1'));
    expect(result).toEqual(mockAlert);
    expect(repo.findById).toHaveBeenCalledWith('alert-1');
  });

  it('throws NotFoundException when alert does not exist', async () => {
    const repo = mockRepo();
    repo.findById = vi.fn().mockResolvedValue(null);
    const handler = new GetAlertByIdHandler(repo);

    await expect(handler.execute(new GetAlertByIdQuery('missing'))).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
