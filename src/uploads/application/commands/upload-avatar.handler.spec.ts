import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import type { EventBus } from '@nestjs/cqrs';
import { describe, expect, it, vi } from 'vitest';
import type { AccessTokenPayload } from '../../../auth/application/commands/sign-in.command.js';
import { UserProfileUpdatedEvent } from '../../../users/domain/events/user-profile-updated.event.js';
import type { UserEntity } from '../../../users/domain/user.entity.js';
import type { UserRepository } from '../../../users/domain/user.repository.js';
import type { StorageService, UploadedFile } from '../../domain/storage.service.js';
import { UploadAvatarCommand } from './upload-avatar.command.js';
import { UploadAvatarHandler } from './upload-avatar.handler.js';

describe('UploadAvatarHandler', () => {
  const mockUser: UserEntity = {
    id: 'user-1',
    name: 'Juan',
    lastname: 'Perez',
    dni: '12345678',
    phone: '987654321',
    email: 'juan@example.com',
    role: 'CIUDADANO',
    image: 'old-avatar.jpg',
    statusAccount: 'ACTIVO',
    createdAt: '2026-09-19',
    updatedAt: '2026-09-19',
  };

  const mockFile = (name = 'avatar.png'): UploadedFile => ({
    fieldname: 'image',
    originalname: name,
    encoding: '7bit',
    mimetype: 'image/png',
    size: 1024,
    buffer: Buffer.from('fake-image-bytes'),
    destination: '',
    filename: '',
    path: '',
  });

  const mockStorageService = (): StorageService => ({
    upload: vi.fn().mockResolvedValue({
      fileId: 'new-uuid.png',
      filename: 'new-uuid.png',
      path: '/uploads/new-uuid.png',
      mimeType: 'image/png',
      size: 1024,
    }),
    delete: vi.fn().mockResolvedValue(undefined),
    getFilePath: vi.fn().mockReturnValue(null),
  });

  const mockUserRepository = (userExists = true): UserRepository => ({
    findAll: vi.fn(),
    findSecurityPersonnel: vi.fn(),
    findById: vi.fn().mockResolvedValue(userExists ? mockUser : null),
    findByEmail: vi.fn(),
    findByDni: vi.fn(),
    findByPhone: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn().mockImplementation((id, data) =>
      Promise.resolve({
        ...mockUser,
        id,
        ...data,
      }),
    ),
    updatePassword: vi.fn(),
  });

  const mockEventBus = (): EventBus => ({ publish: vi.fn() }) as unknown as EventBus;

  it('uploads avatar successfully when caller is owner', async () => {
    const storage = mockStorageService();
    const userRepo = mockUserRepository(true);
    const eventBus = mockEventBus();
    const handler = new UploadAvatarHandler(storage, userRepo, eventBus);

    const currentUser: AccessTokenPayload = {
      sub: 'user-1',
      email: 'juan@example.com',
      role: 'CIUDADANO',
    };

    const command = new UploadAvatarCommand('user-1', mockFile('avatar.jpg'), currentUser);
    const result = await handler.execute(command);

    expect(result.image).toBe('new-uuid.png');
    expect(storage.delete).toHaveBeenCalledWith('old-avatar.jpg');
    expect(storage.upload).toHaveBeenCalled();
    expect(userRepo.update).toHaveBeenCalledWith('user-1', { image: 'new-uuid.png' });
  });

  it('uploads avatar successfully when caller is admin', async () => {
    const storage = mockStorageService();
    const userRepo = mockUserRepository(true);
    const eventBus = mockEventBus();
    const handler = new UploadAvatarHandler(storage, userRepo, eventBus);

    const adminUser: AccessTokenPayload = {
      sub: 'admin-id',
      email: 'admin@example.com',
      role: 'ADMIN',
    };

    const command = new UploadAvatarCommand('user-1', mockFile('avatar.webp'), adminUser);
    const result = await handler.execute(command);

    expect(result.image).toBe('new-uuid.png');
    expect(storage.upload).toHaveBeenCalled();
  });

  it('throws ForbiddenException when caller is not owner nor admin', async () => {
    const storage = mockStorageService();
    const userRepo = mockUserRepository(true);
    const eventBus = mockEventBus();
    const handler = new UploadAvatarHandler(storage, userRepo, eventBus);

    const otherUser: AccessTokenPayload = {
      sub: 'other-user',
      email: 'other@example.com',
      role: 'CIUDADANO',
    };

    const command = new UploadAvatarCommand('user-1', mockFile(), otherUser);
    await expect(handler.execute(command)).rejects.toThrow(ForbiddenException);
    expect(storage.upload).not.toHaveBeenCalled();
    expect(eventBus.publish).not.toHaveBeenCalled();
  });

  it('throws NotFoundException when user does not exist', async () => {
    const storage = mockStorageService();
    const userRepo = mockUserRepository(false);
    const eventBus = mockEventBus();
    const handler = new UploadAvatarHandler(storage, userRepo, eventBus);

    const currentUser: AccessTokenPayload = {
      sub: 'user-nonexistent',
      email: 'none@example.com',
      role: 'ADMIN',
    };

    const command = new UploadAvatarCommand('user-nonexistent', mockFile(), currentUser);
    await expect(handler.execute(command)).rejects.toThrow(NotFoundException);
  });

  it('throws BadRequestException when extension is not allowed', async () => {
    const storage = mockStorageService();
    const userRepo = mockUserRepository(true);
    const eventBus = mockEventBus();
    const handler = new UploadAvatarHandler(storage, userRepo, eventBus);

    const currentUser: AccessTokenPayload = {
      sub: 'user-1',
      email: 'juan@example.com',
      role: 'CIUDADANO',
    };

    const command = new UploadAvatarCommand('user-1', mockFile('malicious.exe'), currentUser);
    await expect(handler.execute(command)).rejects.toThrow(BadRequestException);
    expect(storage.upload).not.toHaveBeenCalled();
    expect(eventBus.publish).not.toHaveBeenCalled();
  });

  it('publishes UserProfileUpdatedEvent with the updated user after a successful upload', async () => {
    const storage = mockStorageService();
    const userRepo = mockUserRepository(true);
    const eventBus = mockEventBus();
    const handler = new UploadAvatarHandler(storage, userRepo, eventBus);

    const currentUser: AccessTokenPayload = {
      sub: 'user-1',
      email: 'juan@example.com',
      role: 'CIUDADANO',
    };

    const command = new UploadAvatarCommand('user-1', mockFile('avatar.jpg'), currentUser);
    const result = await handler.execute(command);

    expect(eventBus.publish).toHaveBeenCalledWith(new UserProfileUpdatedEvent(result));
  });
});
