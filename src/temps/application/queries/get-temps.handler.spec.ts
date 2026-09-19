import { describe, expect, it, vi } from 'vitest';
import type { TempRepository } from '../../domain/temp.repository.js';
import { GetTempsHandler } from './get-temps.handler.js';

describe('GetTempsHandler', () => {
  const mockTemps = [
    {
      id: '1',
      userId: 'user-1',
      tempPassword: 'pass1',
      date: '20/09/2026',
    },
    {
      id: '2',
      userId: 'user-2',
      tempPassword: 'pass2',
      date: '20/09/2026',
    },
  ];

  const mockRepo = (): TempRepository => ({
    findAll: vi.fn().mockResolvedValue(mockTemps),
    findByUser: vi.fn(),
    findById: vi.fn(),
    create: vi.fn(),
    delete: vi.fn(),
  });

  it('retrieves all temporary records with total count', async () => {
    const repo = mockRepo();
    const handler = new GetTempsHandler(repo);

    const result = await handler.execute();
    expect(result.temps).toHaveLength(2);
    expect(result.total).toBe(2);
    expect(repo.findAll).toHaveBeenCalled();
  });
});
