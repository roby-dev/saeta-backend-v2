import { NotFoundException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import type { TempRepository } from '../../domain/temp.repository.js';
import { DeleteTempCommand } from './delete-temp.command.js';
import { DeleteTempHandler } from './delete-temp.handler.js';

describe('DeleteTempHandler', () => {
  const mockTempRepo = (exists = true): TempRepository => ({
    findAll: vi.fn(),
    findByUser: vi.fn(),
    findById: vi.fn().mockResolvedValue(
      exists
        ? {
            id: 'temp-123',
            userId: 'user-123',
            tempPassword: 'password',
            date: '20/09/2026',
          }
        : null,
    ),
    create: vi.fn(),
    delete: vi.fn().mockResolvedValue(true),
  });

  it('deletes temporary password record successfully', async () => {
    const repo = mockTempRepo(true);
    const handler = new DeleteTempHandler(repo);

    const result = await handler.execute(new DeleteTempCommand('temp-123'));

    expect(result.success).toBe(true);
    expect(result.message).toBe('Temporal eliminado');
    expect(repo.delete).toHaveBeenCalledWith('temp-123');
  });

  it('throws NotFoundException when record does not exist', async () => {
    const repo = mockTempRepo(false);
    const handler = new DeleteTempHandler(repo);

    await expect(handler.execute(new DeleteTempCommand('non-existent'))).rejects.toThrow(
      NotFoundException,
    );
    expect(repo.delete).not.toHaveBeenCalled();
  });
});
