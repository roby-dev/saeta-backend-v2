import {
  BadRequestException,
  ForbiddenException,
  Inject,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import * as bcrypt from 'bcrypt';
import {
  USER_REPOSITORY,
  type UserRepository,
} from '../../domain/user.repository.js';
import { ChangePasswordCommand } from './change-password.command.js';

@CommandHandler(ChangePasswordCommand)
export class ChangePasswordHandler
  implements ICommandHandler<ChangePasswordCommand, { success: boolean }>
{
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly users: UserRepository,
  ) {}

  async execute(command: ChangePasswordCommand): Promise<{ success: boolean }> {
    const isSelf = command.currentUserId === command.targetUserId;
    const isAdmin = command.currentUserRole === 'ADMIN';

    if (!isSelf && !isAdmin) {
      throw new ForbiddenException('You do not have permission to change this user password');
    }

    const userWithPassword = await this.users.findByIdWithPassword(command.targetUserId);
    if (!userWithPassword) {
      throw new NotFoundException('User not found');
    }

    // If user is changing their own password and is not ADMIN, verify current password
    if (isSelf && !isAdmin) {
      if (!command.currentPassword) {
        throw new BadRequestException('Current password is required');
      }
      const matches = await bcrypt.compare(
        command.currentPassword,
        userWithPassword.passwordHash,
      );
      if (!matches) {
        throw new UnauthorizedException('Invalid current password');
      }
    }

    const salt = await bcrypt.genSalt(10);
    const newHash = await bcrypt.hash(command.newPassword, salt);

    const updated = await this.users.updatePassword(command.targetUserId, newHash);
    return { success: updated };
  }
}
