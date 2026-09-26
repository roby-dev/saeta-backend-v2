import { ConflictException, NotFoundException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { StateCode } from '../../domain/state-code.enum.js';
import type { StateRepository } from '../../domain/state.repository.js';
import { UpdateStateCommand } from './update-state.command.js';
import { UpdateStateHandler } from './update-state.handler.js';

describe('UpdateStateHandler', () => {
  const existingState = { id: 'state-1', name: 'Pendiente' };

  const mockRepo = (): StateRepository => ({
    findAll: vi.fn(),
    findById: vi.fn().mockResolvedValue(existingState),
    findByName: vi.fn().mockResolvedValue(null),
    findByCode: vi.fn().mockResolvedValue(null),
    create: vi.fn(),
    update: vi.fn().mockImplementation((id, name, code) =>
      Promise.resolve({ id, name, code }),
    ),
  });

  it('updates state name successfully', async () => {
    const repo = mockRepo();
    const handler = new UpdateStateHandler(repo);

    const result = await handler.execute(
      new UpdateStateCommand('state-1', 'Pendiente de Atención'),
    );
    expect(result.name).toBe('Pendiente de Atención');
    expect(repo.update).toHaveBeenCalledWith('state-1', 'Pendiente de Atención');
  });

  it('rejects update if another state has the same name', async () => {
    const repo = mockRepo();
    repo.findByName = vi.fn().mockResolvedValue({ id: 'other-state', name: 'Resuelta' });
    const handler = new UpdateStateHandler(repo);

    await expect(
      handler.execute(new UpdateStateCommand('state-1', 'Resuelta')),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('throws NotFoundException if state does not exist', async () => {
    const repo = mockRepo();
    repo.findById = vi.fn().mockResolvedValue(null);
    const handler = new UpdateStateHandler(repo);

    await expect(
      handler.execute(new UpdateStateCommand('missing-id', 'Nuevo')),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('assigns a code to a state that does not have one yet', async () => {
    const repo = mockRepo();
    const handler = new UpdateStateHandler(repo);

    const result = await handler.execute(
      new UpdateStateCommand('state-1', 'Pendiente', StateCode.PENDING),
    );
    expect(result.code).toBe(StateCode.PENDING);
    expect(repo.update).toHaveBeenCalledWith('state-1', 'Pendiente', StateCode.PENDING);
  });

  it('rejects update if another state already has the requested code', async () => {
    const repo = mockRepo();
    repo.findByCode = vi
      .fn()
      .mockResolvedValue({ id: 'other-state', name: 'Resuelta', code: StateCode.RESOLVED });
    const handler = new UpdateStateHandler(repo);

    await expect(
      handler.execute(new UpdateStateCommand('state-1', 'Pendiente', StateCode.RESOLVED)),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});
