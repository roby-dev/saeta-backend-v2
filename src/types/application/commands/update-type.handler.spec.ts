import { ConflictException, NotFoundException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import type { TypeRepository } from '../../domain/type.repository.js';
import { UpdateTypeCommand } from './update-type.command.js';
import { UpdateTypeHandler } from './update-type.handler.js';

describe('UpdateTypeHandler', () => {
  const existingType = { id: 'type-1', name: 'Robo', priority: 0 };

  const mockRepo = (): TypeRepository => ({
    findAll: vi.fn(),
    findById: vi.fn().mockResolvedValue(existingType),
    findByName: vi.fn().mockResolvedValue(null),
    create: vi.fn(),
    update: vi.fn().mockImplementation((id, name, priority) =>
      Promise.resolve({
        id,
        name: name ?? existingType.name,
        priority: priority ?? existingType.priority,
      }),
    ),
  });

  it('updates type name and priority successfully', async () => {
    const repo = mockRepo();
    const handler = new UpdateTypeHandler(repo);

    const result = await handler.execute(
      new UpdateTypeCommand('type-1', 'Robo a Mano Armada', 3),
    );
    expect(result.name).toBe('Robo a Mano Armada');
    expect(result.priority).toBe(3);
    expect(repo.update).toHaveBeenCalledWith('type-1', 'Robo a Mano Armada', 3);
  });

  it('rejects update if another type has the same name', async () => {
    const repo = mockRepo();
    repo.findByName = vi.fn().mockResolvedValue({ id: 'other-id', name: 'Incendio', priority: 0 });
    const handler = new UpdateTypeHandler(repo);

    await expect(
      handler.execute(new UpdateTypeCommand('type-1', 'Incendio')),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('throws NotFoundException if type does not exist', async () => {
    const repo = mockRepo();
    repo.findById = vi.fn().mockResolvedValue(null);
    const handler = new UpdateTypeHandler(repo);

    await expect(
      handler.execute(new UpdateTypeCommand('missing-id', 'Nuevo')),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
