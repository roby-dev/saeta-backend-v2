import { Inject, UnauthorizedException } from '@nestjs/common';
import { QueryHandler, type IQueryHandler } from '@nestjs/cqrs';
import {
  AUTH_USER_REPOSITORY,
  type AuthUserRepository,
} from '../../domain/auth-user.repository.js';
import { GetCurrentUserQuery, type GetCurrentUserResult } from './get-current-user.query.js';

@QueryHandler(GetCurrentUserQuery)
export class GetCurrentUserHandler
  implements IQueryHandler<GetCurrentUserQuery, GetCurrentUserResult>
{
  constructor(
    @Inject(AUTH_USER_REPOSITORY)
    private readonly users: AuthUserRepository,
  ) {}

  async execute(query: GetCurrentUserQuery): Promise<GetCurrentUserResult> {
    const user = await this.users.findProfileById(query.userId);

    if (!user) {
      throw new UnauthorizedException();
    }

    return user;
  }
}
