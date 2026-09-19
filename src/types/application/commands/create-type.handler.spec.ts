import { ConflictException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import type { TypeRepository } from '../../domain/type.repository.js';
import { CreateTypeCommand } from './create-type.command.js';
import { CreateTypeHandler } from './create-type.handler.js';

describe('CreateTypeHandler', () => {
  const mockRepo = (): TypeRepository => ({
    findAll: vi.fn(),
    findById: vi.fn(),
    findByName: vi.fn().mockResolvedValue(null),
    create: vi.fn().mockImplementation((name, priority) =>
      Promise.resolve({ id: 'type-1', name, priority: priority ?? 0 }),
    ),
    update: vi.fn(),
  });

  it('creates a new type when name is unique', async () => {
    const repo = mockRepo();
    const handler = new CreateTypeHandler(repo);

    const result = await handler.execute(new CreateTypeCommand('Incendio Forestal', 2));
    expect(result.id).toBe('type-1');
    expect(result.name).toBe('Incendio Forestal');
    expect(result.priority).toBe(2);
    expect(repo.create).toHaveBeenCalledWith('Incendio Forestal', 2);
  });

  it('rejects creation when type name already exists', async () => {
    const repo = mockRepo();
    repo.findByName = vi.fn().mockResolvedValue({ id: 'existing', name: 'Robo', priority: 0 });
    const handler = new CreateTypeHandler(repo);

    await expect(
      handler.execute(new CreateTypeCommand('Robo')),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});
