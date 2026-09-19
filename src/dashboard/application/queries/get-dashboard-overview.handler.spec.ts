import { describe, expect, it, vi } from 'vitest';
import {
  formatDurationSeconds,
  GetDashboardOverviewHandler,
  parseAlertDate,
} from './get-dashboard-overview.handler.js';
import { GetDashboardOverviewQuery } from './get-dashboard-overview.query.js';

describe('GetDashboardOverviewHandler', () => {
  it('parses legacy and iso date strings correctly', () => {
    const d1 = parseAlertDate('19/09/2026,14:30:00');
    expect(d1).toBeInstanceOf(Date);
    expect(d1?.getFullYear()).toBe(2026);
    expect(d1?.getMonth()).toBe(8); // 0-indexed September
    expect(d1?.getDate()).toBe(19);

    const d2 = parseAlertDate('2026-09-19T14:30:00.000Z');
    expect(d2).toBeInstanceOf(Date);
    expect(d2?.getFullYear()).toBe(2026);

    expect(parseAlertDate(undefined)).toBeNull();
    expect(parseAlertDate('invalid-date')).toBeNull();
  });

  it('formats duration in seconds to human-readable format', () => {
    expect(formatDurationSeconds(0)).toBe('0 min 0 seg');
    expect(formatDurationSeconds(45)).toBe('0 min 45 seg');
    expect(formatDurationSeconds(60)).toBe('1 min 0 seg');
    expect(formatDurationSeconds(150)).toBe('2 min 30 seg');
  });

  it('executes query and aggregates metrics across collections', async () => {
    const mockStateId1 = '609b1f2e1f1f1f1f1f1f1f11';
    const mockStateId2 = '609b1f2e1f1f1f1f1f1f1f12';
    const mockTypeId = '609b1f2e1f1f1f1f1f1f1f21';

    const mockAlertModel = {
      aggregate: vi.fn().mockImplementation((pipeline: unknown[]) => {
        const firstStage = (pipeline[0] as Record<string, unknown>)?.$group as Record<string, unknown>;
        if (firstStage?._id === '$state') {
          return Promise.resolve([
            { _id: mockStateId1, count: 5 },
            { _id: mockStateId2, count: 3 },
          ]);
        }
        if (firstStage?._id === '$type') {
          return Promise.resolve([{ _id: mockTypeId, count: 8 }]);
        }
        return Promise.resolve([]);
      }),
      find: vi.fn().mockReturnValue({
        lean: vi.fn().mockReturnValue({
          exec: vi.fn().mockResolvedValue([
            {
              creationDate: '19/09/2026,10:00:00',
              attentionDate: '19/09/2026,10:05:00',
              culminationDate: '19/09/2026,10:15:00',
            },
          ]),
        }),
        sort: vi.fn().mockReturnValue({
          limit: vi.fn().mockReturnValue({
            populate: vi.fn().mockReturnValue({
              lean: vi.fn().mockReturnValue({
                exec: vi.fn().mockResolvedValue([
                  {
                    _id: 'alert-1',
                    commentary: 'Buena atención',
                    score: 5,
                    creationDate: '19/09/2026,10:00:00',
                    id_user: { name: 'Juan', lastname: 'Perez' },
                  },
                ]),
              }),
            }),
          }),
        }),
      }),
    };

    const mockUserModel = {
      aggregate: vi.fn().mockResolvedValue([
        { _id: 'ADMIN', count: 2 },
        { _id: 'BASE_SEGURIDAD', count: 4 },
        { _id: 'PERSONAL_SEGURIDAD', count: 10 },
        { _id: 'CIUDADANO', count: 100 },
      ]),
    };

    const mockStateModel = {
      find: vi.fn().mockReturnValue({
        lean: vi.fn().mockReturnValue({
          exec: vi.fn().mockResolvedValue([
            { _id: mockStateId1, name: 'Pendiente' },
            { _id: mockStateId2, name: 'Resuelta' },
          ]),
        }),
      }),
    };

    const mockTypeModel = {
      find: vi.fn().mockReturnValue({
        sort: vi.fn().mockReturnValue({
          lean: vi.fn().mockReturnValue({
            exec: vi.fn().mockResolvedValue([
              { _id: mockTypeId, name: 'Robo', priority: 1 },
            ]),
          }),
        }),
      }),
    };

    const handler = new GetDashboardOverviewHandler(
      mockAlertModel as never,
      mockUserModel as never,
      mockStateModel as never,
      mockTypeModel as never,
    );

    const result = await handler.execute(new GetDashboardOverviewQuery(2026));

    expect(result).toBeDefined();
    expect(result.year).toBe(2026);
    expect(result.users.admin).toBe(2);
    expect(result.users.baseSecurity).toBe(4);
    expect(result.users.securityPersonnel).toBe(10);
    expect(result.users.citizen).toBe(100);
    expect(result.users.total).toBe(116);

    expect(result.states.pending).toBe(5);
    expect(result.states.resolved).toBe(3);
    expect(result.states.total).toBe(8);

    expect(result.typesDistribution.length).toBe(1);
    expect(result.typesDistribution[0].name).toBe('Robo');
    expect(result.typesDistribution[0].count).toBe(8);
    expect(result.typesDistribution[0].percentage).toBe(100);

    // Times: 5 mins attention (300s), 10 mins resolution (600s), 15 mins total (900s)
    expect(result.averageTimes.attentionTimeSeconds).toBe(300);
    expect(result.averageTimes.attentionTimeFormatted).toBe('5 min 0 seg');
    expect(result.averageTimes.resolutionTimeSeconds).toBe(600);
    expect(result.averageTimes.resolutionTimeFormatted).toBe('10 min 0 seg');
    expect(result.averageTimes.totalTimeSeconds).toBe(900);
    expect(result.averageTimes.totalTimeFormatted).toBe('15 min 0 seg');

    expect(result.recentCommentaries.length).toBe(1);
    expect(result.recentCommentaries[0].userName).toBe('Juan Perez');
  });
});
