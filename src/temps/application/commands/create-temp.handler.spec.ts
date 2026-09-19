import { NotFoundException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import type { UserRepository } from '../../../users/domain/user.repository.js';
import type { TempRepository } from '../../domain/temp.repository.js';
import { CreateTempCommand } from './create-temp.command.js';
import { CreateTempHandler } from './create-temp.handler.js';

describe('CreateTempHandler', () => {
  const mockTempRepo = (): TempRepository => ({
    findAll: vi.fn(),
    findByUser: vi.fn(),
    findById: vi.fn(),
    create: vi.fn().mockImplementation((data) =>
      Promise.resolve({
        id: 'temp-123',
        ...data,
      }),
    ),
    delete: vi.fn(),
  });

  const mockUserRepo = (userExists = true): UserRepository => ({
    findAll: vi.fn(),
    findSecurityPersonnel: vi.fn(),
    findById: vi.fn().mockResolvedValue(
      userExists
        ? {
            id: 'user-123',
            name: 'Juan',
            lastname: 'Perez',
            email: 'juan@example.com',
            role: 'CIUDADANO',
          }
        : null,
    ),
    findByEmail: vi.fn(),
    findByDni: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    updatePassword: vi.fn(),
  });

  it('creates temporary password record when user exists', async () => {
    const tempRepo = mockTempRepo();
    const userRepo = mockUserRepo(true);
    const handler = new CreateTempHandler(tempRepo, userRepo);

    const command = new CreateTempCommand('user-123', 'tempPass123', '20/09/2026');
    const result = await handler.execute(command);

    expect(result.id).toBe('temp-123');
    expect(result.tempPassword).toBe('tempPass123');
    expect(result.date).toBe('20/09/2026');
    expect(tempRepo.create).toHaveBeenCalledWith({
      userId: 'user-123',
      tempPassword: 'tempPass123',
      date: '20/09/2026',
    });
  });

  it('defaults date when omitted in command', async () => {
    const tempRepo = mockTempRepo();
    const userRepo = mockUserRepo(true);
    const handler = new CreateTempHandler(tempRepo, userRepo);

    const command = new CreateTempCommand('user-123', 'tempPass123');
    const result = await handler.execute(command);

    expect(result.id).toBe('temp-123');
    expect(result.date).toBeDefined();
    expect(tempRepo.create).toHaveBeenCalled();
  });

  it('throws NotFoundException when user does not exist', async () => {
    const tempRepo = mockTempRepo();
    const userRepo = mockUserRepo(false);
    const handler = new CreateTempHandler(tempRepo, userRepo);

    const command = new CreateTempCommand('non-existent-user', 'tempPass123');
    await expect(handler.execute(command)).rejects.toThrow(NotFoundException);
    expect(tempRepo.create).not.toHaveBeenCalled();
  });
});
