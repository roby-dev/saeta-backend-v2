import {
  ForbiddenException,
  Inject,
  NotFoundException,
} from '@nestjs/common';
import { type IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import type { UserEntity, UserRole } from '../../domain/user.entity.js';
import {
  USER_REPOSITORY,
  type UserRepository,
} from '../../domain/user.repository.js';
import { GetUserByIdQuery } from './get-user-by-id.query.js';

@QueryHandler(GetUserByIdQuery)
export class GetUserByIdHandler implements IQueryHandler<GetUserByIdQuery, UserEntity> {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly users: UserRepository,
  ) {}

  async execute(query: GetUserByIdQuery): Promise<UserEntity> {
    const isSelf = query.currentUserId === query.targetUserId;
    const privilegedRoles: UserRole[] = ['ADMIN', 'BASE_SEGURIDAD'];
    const isPrivileged = privilegedRoles.includes(query.currentUserRole);

    if (!isSelf && !isPrivileged) {
      throw new ForbiddenException('You do not have permission to view this user');
    }

    const user = await this.users.findById(query.targetUserId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }
}
