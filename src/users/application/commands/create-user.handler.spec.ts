import { ConflictException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import type { UserRepository } from '../../domain/user.repository.js';
import { CreateUserCommand } from './create-user.command.js';
import { CreateUserHandler } from './create-user.handler.js';

describe('CreateUserHandler', () => {
  const baseCommand = new CreateUserCommand(
    'Carlos',
    'Lopez',
    '12345678',
    '987654321',
    'carlos@saeta.test',
    'plainpassword123',
    'CIUDADANO',
  );

  const mockRepo = (): UserRepository => ({
    findById: vi.fn(),
    findByIdWithPassword: vi.fn(),
    findByEmail: vi.fn().mockResolvedValue(null),
    findByDni: vi.fn().mockResolvedValue(null),
    findByPhone: vi.fn().mockResolvedValue(null),
    findMany: vi.fn(),
    findSecurityPersonnel: vi.fn(),
    create: vi.fn().mockImplementation((data) =>
      Promise.resolve({
        id: 'new-user-id',
        ...data,
        statusAccount: data.statusAccount ?? 'HABILITADO',
      }),
    ),
    update: vi.fn(),
    updatePassword: vi.fn(),
  });

  it('creates a citizen user when details are unique', async () => {
    const repo = mockRepo();
    const handler = new CreateUserHandler(repo);

    const result = await handler.execute(baseCommand);

    expect(result.id).toBe('new-user-id');
    expect(result.role).toBe('CIUDADANO');
    expect(repo.create).toHaveBeenCalled();
  });

  it('prevents non-privileged creator from assigning elevated roles', async () => {
    const repo = mockRepo();
    const handler = new CreateUserHandler(repo);

    const command = new CreateUserCommand(
      'Carlos',
      'Lopez',
      '12345678',
      '987654321',
      'carlos@saeta.test',
      'plainpassword123',
      'ADMIN',
      'CIUDADANO', // creator is regular citizen
    );

    const result = await handler.execute(command);
    expect(result.role).toBe('CIUDADANO');
  });

  it('allows ADMIN creator to assign elevated roles', async () => {
    const repo = mockRepo();
    const handler = new CreateUserHandler(repo);

    const command = new CreateUserCommand(
      'Carlos',
      'Lopez',
      '12345678',
      '987654321',
      'carlos@saeta.test',
      'plainpassword123',
      'PERSONAL_SEGURIDAD',
      'ADMIN', // creator is ADMIN
    );

    const result = await handler.execute(command);
    expect(result.role).toBe('PERSONAL_SEGURIDAD');
  });

  it('throws ConflictException when DNI already exists', async () => {
    const repo = mockRepo();
    repo.findByDni = vi.fn().mockResolvedValue({ id: 'existing-id' } as never);
    const handler = new CreateUserHandler(repo);

    await expect(handler.execute(baseCommand)).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('throws ConflictException when Email already exists', async () => {
    const repo = mockRepo();
    repo.findByEmail = vi.fn().mockResolvedValue({ id: 'existing-id' } as never);
    const handler = new CreateUserHandler(repo);

    await expect(handler.execute(baseCommand)).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('throws ConflictException when Phone already exists for non-admin user', async () => {
    const repo = mockRepo();
    repo.findByPhone = vi.fn().mockResolvedValue({ id: 'existing-id', role: 'CIUDADANO' } as never);
    const handler = new CreateUserHandler(repo);

    await expect(handler.execute(baseCommand)).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('allows user creation when existing phone belongs to an ADMIN user', async () => {
    const repo = mockRepo();
    repo.findByPhone = vi.fn().mockResolvedValue({ id: 'admin-id', role: 'ADMIN' } as never);
    const handler = new CreateUserHandler(repo);

    const result = await handler.execute(baseCommand);
    expect(result.id).toBe('new-user-id');
  });
});
