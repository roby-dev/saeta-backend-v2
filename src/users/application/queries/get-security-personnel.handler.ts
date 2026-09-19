import { Inject } from '@nestjs/common';
import { type IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import type { UserEntity } from '../../domain/user.entity.js';
import {
  USER_REPOSITORY,
  type UserRepository,
} from '../../domain/user.repository.js';
import { GetSecurityPersonnelQuery } from './get-security-personnel.query.js';

@QueryHandler(GetSecurityPersonnelQuery)
export class GetSecurityPersonnelHandler
  implements IQueryHandler<GetSecurityPersonnelQuery, UserEntity[]>
{
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly users: UserRepository,
  ) {}

  async execute(): Promise<UserEntity[]> {
    return this.users.findSecurityPersonnel();
  }
}
