import { ConflictException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { StateCode } from '../../domain/state-code.enum.js';
import type { StateRepository } from '../../domain/state.repository.js';
import { CreateStateCommand } from './create-state.command.js';
import { CreateStateHandler } from './create-state.handler.js';

describe('CreateStateHandler', () => {
  const mockRepo = (): StateRepository => ({
    findAll: vi.fn(),
    findById: vi.fn(),
    findByName: vi.fn().mockResolvedValue(null),
    findByCode: vi.fn().mockResolvedValue(null),
    create: vi.fn().mockImplementation((name, code) =>
      Promise.resolve({ id: 'state-1', name, code }),
    ),
    update: vi.fn(),
  });

  it('creates a new state when name is unique', async () => {
    const repo = mockRepo();
    const handler = new CreateStateHandler(repo);

    const result = await handler.execute(new CreateStateCommand('En camino'));
    expect(result.id).toBe('state-1');
    expect(result.name).toBe('En camino');
    expect(repo.create).toHaveBeenCalledWith('En camino');
  });

  it('rejects creation when state name already exists', async () => {
    const repo = mockRepo();
    repo.findByName = vi.fn().mockResolvedValue({ id: 'existing', name: 'Pendiente' });
    const handler = new CreateStateHandler(repo);

    await expect(
      handler.execute(new CreateStateCommand('Pendiente')),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('creates a state with an explicit code', async () => {
    const repo = mockRepo();
    const handler = new CreateStateHandler(repo);

    const result = await handler.execute(
      new CreateStateCommand('Pendiente', StateCode.PENDING),
    );
    expect(result.code).toBe(StateCode.PENDING);
    expect(repo.create).toHaveBeenCalledWith('Pendiente', StateCode.PENDING);
  });

  it('rejects creation when the code is already used by another state', async () => {
    const repo = mockRepo();
    repo.findByCode = vi
      .fn()
      .mockResolvedValue({ id: 'other-state', name: 'Resuelta', code: StateCode.RESOLVED });
    const handler = new CreateStateHandler(repo);

    await expect(
      handler.execute(new CreateStateCommand('Resuelta duplicada', StateCode.RESOLVED)),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});
