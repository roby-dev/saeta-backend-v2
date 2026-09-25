import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import type { EventBus } from '@nestjs/cqrs';
import { describe, expect, it, vi } from 'vitest';
import { UserDisabledEvent } from '../../domain/events/user-disabled.event.js';
import type { UserEntity } from '../../domain/user.entity.js';
import type { UserRepository } from '../../domain/user.repository.js';
import { UpdateUserCommand } from './update-user.command.js';
import { UpdateUserHandler } from './update-user.handler.js';

describe('UpdateUserHandler', () => {
  const existingUser: UserEntity = {
    id: 'target-user-id',
    name: 'Mario',
    lastname: 'Bros',
    dni: '87654321',
    phone: '912345678',
    email: 'mario@saeta.test',
    role: 'CIUDADANO',
    statusAccount: 'HABILITADO',
  };

  const mockRepo = (): UserRepository => ({
    findById: vi.fn().mockResolvedValue(existingUser),
    findByIdWithPassword: vi.fn(),
    findByEmail: vi.fn().mockResolvedValue(null),
    findByDni: vi.fn().mockResolvedValue(null),
    findByPhone: vi.fn().mockResolvedValue(null),
    findMany: vi.fn(),
    findSecurityPersonnel: vi.fn(),
    create: vi.fn(),
    update: vi.fn().mockImplementation((id, data) =>
      Promise.resolve({ ...existingUser, ...data }),
    ),
    updatePassword: vi.fn(),
  });

  const mockEventBus = () => ({ publish: vi.fn() }) as unknown as EventBus;

  it('allows self to update own profile', async () => {
    const repo = mockRepo();
    const handler = new UpdateUserHandler(repo, mockEventBus());

    const command = new UpdateUserCommand(
      'target-user-id',
      'target-user-id',
      'CIUDADANO',
      { name: 'Mario Updated' },
    );

    const result = await handler.execute(command);
    expect(result.name).toBe('Mario Updated');
    expect(repo.update).toHaveBeenCalledWith('target-user-id', {
      name: 'Mario Updated',
    });
  });

  it('forbids other non-privileged user from updating someone else', async () => {
    const repo = mockRepo();
    const handler = new UpdateUserHandler(repo, mockEventBus());

    const command = new UpdateUserCommand(
      'target-user-id',
      'other-user-id',
      'CIUDADANO',
      { name: 'Hacked' },
    );

    await expect(handler.execute(command)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('allows ADMIN to update any user and change statusAccount', async () => {
    const repo = mockRepo();
    const handler = new UpdateUserHandler(repo, mockEventBus());

    const command = new UpdateUserCommand(
      'target-user-id',
      'admin-id',
      'ADMIN',
      { statusAccount: 'INHABILITADO' },
    );

    const result = await handler.execute(command);
    expect(result.statusAccount).toBe('INHABILITADO');
  });

  it('strips statusAccount modification when self updates without privileges', async () => {
    const repo = mockRepo();
    const handler = new UpdateUserHandler(repo, mockEventBus());

    const command = new UpdateUserCommand(
      'target-user-id',
      'target-user-id',
      'CIUDADANO',
      { statusAccount: 'INHABILITADO', name: 'Mario' },
    );

    await handler.execute(command);
    expect(repo.update).toHaveBeenCalledWith('target-user-id', { name: 'Mario' });
  });

  it('rejects update if emergency contacts exceed 5', async () => {
    const repo = mockRepo();
    const handler = new UpdateUserHandler(repo, mockEventBus());

    const command = new UpdateUserCommand(
      'target-user-id',
      'target-user-id',
      'CIUDADANO',
      {
        emergencyContacts: [
          { name: '1', phone: '900000001' },
          { name: '2', phone: '900000002' },
          { name: '3', phone: '900000003' },
          { name: '4', phone: '900000004' },
          { name: '5', phone: '900000005' },
          { name: '6', phone: '900000006' },
        ],
      },
    );

    await expect(handler.execute(command)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('rejects email update if email is taken by another user', async () => {
    const repo = mockRepo();
    repo.findByEmail = vi.fn().mockResolvedValue({ id: 'someone-else' } as never);
    const handler = new UpdateUserHandler(repo, mockEventBus());

    const command = new UpdateUserCommand(
      'target-user-id',
      'target-user-id',
      'CIUDADANO',
      { email: 'taken@saeta.test' },
    );

    await expect(handler.execute(command)).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('rejects phone update if phone is taken by another non-admin user', async () => {
    const repo = mockRepo();
    repo.findByPhone = vi.fn().mockResolvedValue({ id: 'someone-else', role: 'CIUDADANO' } as never);
    const handler = new UpdateUserHandler(repo, mockEventBus());

    const command = new UpdateUserCommand(
      'target-user-id',
      'target-user-id',
      'CIUDADANO',
      { phone: '911111111' },
    );

    await expect(handler.execute(command)).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('allows phone update if phone is associated with an ADMIN user', async () => {
    const repo = mockRepo();
    repo.findByPhone = vi.fn().mockResolvedValue({ id: 'admin-user-id', role: 'ADMIN' } as never);
    const handler = new UpdateUserHandler(repo, mockEventBus());

    const command = new UpdateUserCommand(
      'target-user-id',
      'target-user-id',
      'CIUDADANO',
      { phone: '911111111' },
    );

    const result = await handler.execute(command);
    expect(result.id).toBe('target-user-id');
  });

  it('throws NotFoundException when user does not exist', async () => {
    const repo = mockRepo();
    repo.findById = vi.fn().mockResolvedValue(null);
    const handler = new UpdateUserHandler(repo, mockEventBus());

    const command = new UpdateUserCommand(
      'missing-user-id',
      'missing-user-id',
      'CIUDADANO',
      { name: 'Mario' },
    );

    await expect(handler.execute(command)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('publishes UserDisabledEvent when a privileged user disables an enabled account', async () => {
    const repo = mockRepo();
    const eventBus = mockEventBus();
    const handler = new UpdateUserHandler(repo, eventBus);

    await handler.execute(
      new UpdateUserCommand('target-user-id', 'admin-id', 'ADMIN', { statusAccount: 'INHABILITADO' }),
    );

    expect(eventBus.publish).toHaveBeenCalledWith(new UserDisabledEvent('target-user-id'));
  });

  it('does not publish UserDisabledEvent when the account was already disabled', async () => {
    const repo = mockRepo();
    vi.mocked(repo.findById).mockResolvedValue({ ...existingUser, statusAccount: 'INHABILITADO' });
    const eventBus = mockEventBus();
    const handler = new UpdateUserHandler(repo, eventBus);

    await handler.execute(
      new UpdateUserCommand('target-user-id', 'admin-id', 'ADMIN', { statusAccount: 'INHABILITADO' }),
    );

    expect(eventBus.publish).not.toHaveBeenCalled();
  });

  it('does not publish UserDisabledEvent when a citizen tries to disable their own account', async () => {
    const repo = mockRepo();
    const eventBus = mockEventBus();
    const handler = new UpdateUserHandler(repo, eventBus);

    await handler.execute(
      new UpdateUserCommand('target-user-id', 'target-user-id', 'CIUDADANO', { statusAccount: 'INHABILITADO' }),
    );

    expect(eventBus.publish).not.toHaveBeenCalled();
  });

  it('does not publish UserDisabledEvent for updates that keep the account enabled', async () => {
    const repo = mockRepo();
    const eventBus = mockEventBus();
    const handler = new UpdateUserHandler(repo, eventBus);

    await handler.execute(new UpdateUserCommand('target-user-id', 'admin-id', 'ADMIN', { name: 'Luigi' }));

    expect(eventBus.publish).not.toHaveBeenCalled();
  });
});
