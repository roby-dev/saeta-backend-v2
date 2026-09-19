import { NotFoundException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import type { TypeRepository } from '../../domain/type.repository.js';
import { GetTypeByIdHandler } from './get-type-by-id.handler.js';
import { GetTypeByIdQuery } from './get-type-by-id.query.js';

describe('GetTypeByIdHandler', () => {
  const mockType = { id: 'type-1', name: 'Robo', priority: 0 };

  const mockRepo = (): TypeRepository => ({
    findAll: vi.fn(),
    findById: vi.fn().mockResolvedValue(mockType),
    findByName: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  });

  it('retrieves type by id', async () => {
    const repo = mockRepo();
    const handler = new GetTypeByIdHandler(repo);

    const result = await handler.execute(new GetTypeByIdQuery('type-1'));
    expect(result).toEqual(mockType);
    expect(repo.findById).toHaveBeenCalledWith('type-1');
  });

  it('throws NotFoundException if type is missing', async () => {
    const repo = mockRepo();
    repo.findById = vi.fn().mockResolvedValue(null);
    const handler = new GetTypeByIdHandler(repo);

    await expect(
      handler.execute(new GetTypeByIdQuery('missing')),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
