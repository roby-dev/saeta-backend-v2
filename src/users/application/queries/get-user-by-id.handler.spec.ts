import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import type { UserEntity } from '../../domain/user.entity.js';
import type { UserRepository } from '../../domain/user.repository.js';
import { GetUserByIdHandler } from './get-user-by-id.handler.js';
import { GetUserByIdQuery } from './get-user-by-id.query.js';

describe('GetUserByIdHandler', () => {
  const mockUser: UserEntity = {
    id: 'user-xyz',
    name: 'Sofia',
    lastname: 'Silva',
    dni: '33445566',
    phone: '977889900',
    email: 'sofia@saeta.test',
    role: 'CIUDADANO',
    statusAccount: 'HABILITADO',
  };

  const mockRepo = (): UserRepository => ({
    findById: vi.fn().mockResolvedValue(mockUser),
    findByIdWithPassword: vi.fn(),
    findByEmail: vi.fn(),
    findByDni: vi.fn(),
    findByPhone: vi.fn(),
    findMany: vi.fn(),
    findSecurityPersonnel: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    updatePassword: vi.fn(),
  });

  it('allows user to view own profile', async () => {
    const repo = mockRepo();
    const handler = new GetUserByIdHandler(repo);

    const result = await handler.execute(
      new GetUserByIdQuery('user-xyz', 'user-xyz', 'CIUDADANO'),
    );

    expect(result).toEqual(mockUser);
    expect(repo.findById).toHaveBeenCalledWith('user-xyz');
  });

  it('allows ADMIN to view any profile', async () => {
    const repo = mockRepo();
    const handler = new GetUserByIdHandler(repo);

    const result = await handler.execute(
      new GetUserByIdQuery('user-xyz', 'admin-id', 'ADMIN'),
    );

    expect(result).toEqual(mockUser);
  });

  it('allows BASE_SEGURIDAD to view any profile', async () => {
    const repo = mockRepo();
    const handler = new GetUserByIdHandler(repo);

    const result = await handler.execute(
      new GetUserByIdQuery('user-xyz', 'base-id', 'BASE_SEGURIDAD'),
    );

    expect(result).toEqual(mockUser);
  });

  it('forbids other user from viewing someone else profile', async () => {
    const repo = mockRepo();
    const handler = new GetUserByIdHandler(repo);

    await expect(
      handler.execute(
        new GetUserByIdQuery('user-xyz', 'stranger-id', 'CIUDADANO'),
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('throws NotFoundException when user does not exist', async () => {
    const repo = mockRepo();
    repo.findById = vi.fn().mockResolvedValue(null);
    const handler = new GetUserByIdHandler(repo);

    await expect(
      handler.execute(new GetUserByIdQuery('missing-id', 'missing-id', 'CIUDADANO')),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
