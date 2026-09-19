import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import type { UserEntity } from '../../../users/domain/user.entity.js';
import {
  USER_REPOSITORY,
  type UserRepository,
} from '../../../users/domain/user.repository.js';
import {
  STORAGE_SERVICE,
  type StorageService,
} from '../../domain/storage.service.js';
import { UploadAvatarCommand } from './upload-avatar.command.js';

const ALLOWED_EXTENSIONS = new Set(['png', 'jpg', 'jpeg', 'gif', 'webp']);

@Injectable()
@CommandHandler(UploadAvatarCommand)
export class UploadAvatarHandler
  implements ICommandHandler<UploadAvatarCommand, UserEntity>
{
  constructor(
    @Inject(STORAGE_SERVICE)
    private readonly storageService: StorageService,
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepository,
  ) {}

  async execute(command: UploadAvatarCommand): Promise<UserEntity> {
    const isOwner = command.requestingUser.sub === command.userId;
    const isAdmin = command.requestingUser.role === 'ADMIN';

    if (!isOwner && !isAdmin) {
      throw new ForbiddenException(
        'You do not have permission to update this user avatar',
      );
    }

    const user = await this.userRepository.findById(command.userId);
    if (!user) {
      throw new NotFoundException(`User with ID ${command.userId} not found`);
    }

    if (!command.file || !command.file.buffer) {
      throw new BadRequestException('No image file was provided');
    }

    const originalName = command.file.originalname ?? '';
    const parts = originalName.split('.');
    const ext = (parts.length > 1 ? parts.pop() : '')?.toLowerCase() ?? '';

    if (!ALLOWED_EXTENSIONS.has(ext)) {
      throw new BadRequestException(
        `Invalid image extension .${ext}. Allowed extensions: png, jpg, jpeg, gif, webp`,
      );
    }

    // Clean up previous image if it exists
    if (user.image) {
      await this.storageService.delete(user.image);
    }

    const result = await this.storageService.upload(command.file);

    const updatedUser = await this.userRepository.update(command.userId, {
      image: result.fileId,
    });

    if (!updatedUser) {
      throw new NotFoundException('Failed to update user avatar');
    }

    return updatedUser;
  }
}
