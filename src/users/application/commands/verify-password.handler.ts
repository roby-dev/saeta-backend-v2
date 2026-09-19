import {
  ForbiddenException,
  Inject,
  NotFoundException,
} from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import * as bcrypt from 'bcrypt';
import {
  USER_REPOSITORY,
  type UserRepository,
} from '../../domain/user.repository.js';
import { VerifyPasswordCommand } from './verify-password.command.js';

export interface VerifyPasswordResult {
  ok: boolean;
  msg: string;
}

@CommandHandler(VerifyPasswordCommand)
export class VerifyPasswordHandler
  implements ICommandHandler<VerifyPasswordCommand, VerifyPasswordResult>
{
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly users: UserRepository,
  ) {}

  async execute(command: VerifyPasswordCommand): Promise<VerifyPasswordResult> {
    const isSelf = command.currentUserId === command.targetUserId;
    const isAdmin = command.currentUserRole === 'ADMIN';

    if (!isSelf && !isAdmin) {
      throw new ForbiddenException('You do not have permission to verify this password');
    }

    const userWithPassword = await this.users.findByIdWithPassword(command.targetUserId);
    if (!userWithPassword) {
      throw new NotFoundException('User not found');
    }

    const matches = await bcrypt.compare(command.password, userWithPassword.passwordHash);

    return {
      ok: matches,
      msg: matches ? 'Contraseña confirmada' : 'Contraseña incorrecta',
    };
  }
}
