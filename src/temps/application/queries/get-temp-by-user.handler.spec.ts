import { describe, expect, it, vi } from 'vitest';
import type { TempRepository } from '../../domain/temp.repository.js';
import { GetTempByUserHandler } from './get-temp-by-user.handler.js';
import { GetTempByUserQuery } from './get-temp-by-user.query.js';

describe('GetTempByUserHandler', () => {
  const mockTemp = {
    id: '1',
    userId: 'user-1',
    tempPassword: 'pass1',
    date: '20/09/2026',
  };

  const mockRepo = (found = true): TempRepository => ({
    findAll: vi.fn(),
    findByUser: vi.fn().mockResolvedValue(found ? mockTemp : null),
    findById: vi.fn(),
    create: vi.fn(),
    delete: vi.fn(),
  });

  it('retrieves temp record by user id', async () => {
    const repo = mockRepo(true);
    const handler = new GetTempByUserHandler(repo);

    const result = await handler.execute(new GetTempByUserQuery('user-1'));
    expect(result).toEqual(mockTemp);
    expect(repo.findByUser).toHaveBeenCalledWith('user-1');
  });

  it('returns null when temp record not found for user', async () => {
    const repo = mockRepo(false);
    const handler = new GetTempByUserHandler(repo);

    const result = await handler.execute(new GetTempByUserQuery('user-nonexistent'));
    expect(result).toBeNull();
  });
});
