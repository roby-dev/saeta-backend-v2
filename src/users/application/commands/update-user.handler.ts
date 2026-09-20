import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  NotFoundException,
} from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import type { UserEntity, UserRole } from '../../domain/user.entity.js';
import {
  USER_REPOSITORY,
  type UserRepository,
} from '../../domain/user.repository.js';
import { UpdateUserCommand } from './update-user.command.js';

@CommandHandler(UpdateUserCommand)
export class UpdateUserHandler implements ICommandHandler<UpdateUserCommand, UserEntity> {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly users: UserRepository,
  ) {}

  async execute(command: UpdateUserCommand): Promise<UserEntity> {
    const isSelf = command.currentUserId === command.targetUserId;
    const privilegedRoles: UserRole[] = ['ADMIN', 'BASE_SEGURIDAD'];
    const isPrivileged = privilegedRoles.includes(command.currentUserRole);

    if (!isSelf && !isPrivileged) {
      throw new ForbiddenException('You do not have permission to update this user');
    }

    const existingUser = await this.users.findById(command.targetUserId);
    if (!existingUser) {
      throw new NotFoundException('User not found');
    }

    if (command.data.emergencyContacts && command.data.emergencyContacts.length > 5) {
      throw new BadRequestException('Cannot have more than 5 emergency contacts');
    }

    // Email collision check
    if (command.data.email && command.data.email.toLowerCase().trim() !== existingUser.email) {
      const emailUser = await this.users.findByEmail(command.data.email);
      if (emailUser && emailUser.id !== command.targetUserId) {
        throw new ConflictException('Email is already registered');
      }
    }

    // Phone collision check
    if (command.data.phone && command.data.phone.trim() !== existingUser.phone) {
      const phoneUser = await this.users.findByPhone(command.data.phone);
      if (phoneUser && phoneUser.id !== command.targetUserId && phoneUser.role !== 'ADMIN') {
        throw new ConflictException('Phone number is already registered');
      }
    }

    // StatusAccount change restriction: only privileged users
    const updatePayload = { ...command.data };
    if (updatePayload.statusAccount && !isPrivileged) {
      delete updatePayload.statusAccount;
    }

    const updated = await this.users.update(command.targetUserId, updatePayload);
    if (!updated) {
      throw new NotFoundException('User not found');
    }

    return updated;
  }
}
