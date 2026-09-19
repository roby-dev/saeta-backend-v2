import { describe, expect, it, vi } from 'vitest';
import type { AlertEntity } from '../../domain/alert.entity.js';
import type { AlertRepository } from '../../domain/alert.repository.js';
import { GetAlertsHandler } from './get-alerts.handler.js';
import { GetAlertsQuery } from './get-alerts.query.js';

describe('GetAlertsHandler', () => {
  const mockAlerts: AlertEntity[] = [
    {
      id: 'alert-1',
      userId: 'user-1',
      latitude: -18.01,
      longitude: -70.25,
      typeId: 'type-1',
      stateId: 'state-1',
      creationDate: '19/09/2026,10:00:00',
    },
  ];

  it('returns paginated alerts and calculates totalPages', async () => {
    const mockStateCounts = {
      pending: 1,
      inProcess: 0,
      resolved: 0,
      rejected: 0,
      total: 1,
    };

    const mockRepo = (): AlertRepository => ({
      findById: vi.fn(),
      findMany: vi.fn().mockResolvedValue({
        alerts: mockAlerts,
        total: 1,
        stateCounts: mockStateCounts,
      }),
      findByUser: vi.fn(),
      findByAttendedUser: vi.fn(),
      findPendingByUser: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      deletePending: vi.fn(),
      getDefaultPendingStateId: vi.fn(),
    });

    const repo = mockRepo();
    const handler = new GetAlertsHandler(repo);

    const result = await handler.execute(new GetAlertsQuery(1, 10));

    expect(result.alerts).toHaveLength(1);
    expect(result.total).toBe(1);
    expect(result.page).toBe(1);
    expect(result.totalPages).toBe(1);
    expect(result.stateCounts).toEqual(mockStateCounts);
  });
});
