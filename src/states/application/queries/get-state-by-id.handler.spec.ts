import { NotFoundException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import type { StateRepository } from '../../domain/state.repository.js';
import { GetStateByIdHandler } from './get-state-by-id.handler.js';
import { GetStateByIdQuery } from './get-state-by-id.query.js';

describe('GetStateByIdHandler', () => {
  const mockState = { id: 'state-1', name: 'Pendiente' };

  const mockRepo = (): StateRepository => ({
    findAll: vi.fn(),
    findById: vi.fn().mockResolvedValue(mockState),
    findByName: vi.fn(),
    findByCode: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  });

  it('retrieves state by id', async () => {
    const repo = mockRepo();
    const handler = new GetStateByIdHandler(repo);

    const result = await handler.execute(new GetStateByIdQuery('state-1'));
    expect(result).toEqual(mockState);
    expect(repo.findById).toHaveBeenCalledWith('state-1');
  });

  it('throws NotFoundException if state is missing', async () => {
    const repo = mockRepo();
    repo.findById = vi.fn().mockResolvedValue(null);
    const handler = new GetStateByIdHandler(repo);

    await expect(
      handler.execute(new GetStateByIdQuery('missing')),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
