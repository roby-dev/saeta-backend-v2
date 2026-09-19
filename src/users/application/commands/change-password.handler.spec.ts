import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { describe, expect, it, vi } from 'vitest';
import type { UserWithPassword } from '../../domain/user.entity.js';
import type { UserRepository } from '../../domain/user.repository.js';
import { ChangePasswordCommand } from './change-password.command.js';
import { ChangePasswordHandler } from './change-password.handler.js';

describe('ChangePasswordHandler', () => {
  const oldPassword = 'old-password-123';
  const newPassword = 'new-password-456';

  const mockUserWithPassword = async (): Promise<UserWithPassword> => ({
    id: 'user-123',
    name: 'Ana',
    lastname: 'Gomez',
    dni: '11223344',
    phone: '988776655',
    email: 'ana@saeta.test',
    role: 'CIUDADANO',
    statusAccount: 'HABILITADO',
    passwordHash: await bcrypt.hash(oldPassword, 4),
  });

  const mockRepo = async (): Promise<UserRepository> => {
    const user = await mockUserWithPassword();
    return {
      findById: vi.fn(),
      findByIdWithPassword: vi.fn().mockResolvedValue(user),
      findByEmail: vi.fn(),
      findByDni: vi.fn(),
      findByPhone: vi.fn(),
      findMany: vi.fn(),
      findSecurityPersonnel: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updatePassword: vi.fn().mockResolvedValue(true),
    };
  };

  it('allows user to change own password when current password matches', async () => {
    const repo = await mockRepo();
    const handler = new ChangePasswordHandler(repo);

    const command = new ChangePasswordCommand(
      'user-123',
      'user-123',
      'CIUDADANO',
      newPassword,
      oldPassword,
    );

    const result = await handler.execute(command);
    expect(result.success).toBe(true);
    expect(repo.updatePassword).toHaveBeenCalled();
  });

  it('rejects password change if current password is wrong', async () => {
    const repo = await mockRepo();
    const handler = new ChangePasswordHandler(repo);

    const command = new ChangePasswordCommand(
      'user-123',
      'user-123',
      'CIUDADANO',
      newPassword,
      'wrong-password',
    );

    await expect(handler.execute(command)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('rejects password change if current password is not provided by self', async () => {
    const repo = await mockRepo();
    const handler = new ChangePasswordHandler(repo);

    const command = new ChangePasswordCommand(
      'user-123',
      'user-123',
      'CIUDADANO',
      newPassword,
    );

    await expect(handler.execute(command)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('allows ADMIN to reset user password without providing current password', async () => {
    const repo = await mockRepo();
    const handler = new ChangePasswordHandler(repo);

    const command = new ChangePasswordCommand(
      'user-123',
      'admin-id',
      'ADMIN',
      newPassword,
    );

    const result = await handler.execute(command);
    expect(result.success).toBe(true);
  });

  it('forbids non-admin user from changing another user password', async () => {
    const repo = await mockRepo();
    const handler = new ChangePasswordHandler(repo);

    const command = new ChangePasswordCommand(
      'user-123',
      'other-id',
      'CIUDADANO',
      newPassword,
      oldPassword,
    );

    await expect(handler.execute(command)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('throws NotFoundException when user does not exist', async () => {
    const repo = await mockRepo();
    repo.findByIdWithPassword = vi.fn().mockResolvedValue(null);
    const handler = new ChangePasswordHandler(repo);

    const command = new ChangePasswordCommand(
      'missing-id',
      'admin-id',
      'ADMIN',
      newPassword,
    );

    await expect(handler.execute(command)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
