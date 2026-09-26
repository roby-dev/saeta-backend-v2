import { describe, expect, it, vi } from 'vitest';
import type { StateRepository } from '../../domain/state.repository.js';
import { GetStatesHandler } from './get-states.handler.js';

describe('GetStatesHandler', () => {
  const mockStates = [
    { id: '1', name: 'Pendiente' },
    { id: '2', name: 'En proceso' },
  ];

  const mockRepo = (): StateRepository => ({
    findAll: vi.fn().mockResolvedValue(mockStates),
    findById: vi.fn(),
    findByName: vi.fn(),
    findByCode: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  });

  it('retrieves all states and returns total count', async () => {
    const repo = mockRepo();
    const handler = new GetStatesHandler(repo);

    const result = await handler.execute();
    expect(result.states).toHaveLength(2);
    expect(result.total).toBe(2);
    expect(repo.findAll).toHaveBeenCalled();
  });
});
