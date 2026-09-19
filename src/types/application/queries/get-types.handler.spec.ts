import { describe, expect, it, vi } from 'vitest';
import type { TypeRepository } from '../../domain/type.repository.js';
import { GetTypesHandler } from './get-types.handler.js';
import { GetTypesQuery } from './get-types.query.js';

describe('GetTypesHandler', () => {
  const mockTypes = [
    { id: '1', name: 'Emergencia', priority: 1 },
    { id: '2', name: 'Robo', priority: 0 },
  ];

  const mockRepo = (): TypeRepository => ({
    findAll: vi.fn().mockResolvedValue({ types: mockTypes, total: 2 }),
    findById: vi.fn(),
    findByName: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  });

  it('retrieves all types and returns total count', async () => {
    const repo = mockRepo();
    const handler = new GetTypesHandler(repo);

    const result = await handler.execute(new GetTypesQuery(0, 10));
    expect(result.types).toHaveLength(2);
    expect(result.total).toBe(2);
    expect(repo.findAll).toHaveBeenCalledWith(0, 10);
  });
});
