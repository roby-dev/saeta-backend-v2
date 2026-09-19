import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';
import {
  type AccountStatus,
  accountStatuses,
  type UserRole,
  userRoles,
} from '../../domain/user.entity.js';

export class GetUsersQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 10;

  @IsOptional()
  @IsIn(userRoles)
  role?: UserRole;

  @IsOptional()
  @IsIn(accountStatuses)
  statusAccount?: AccountStatus;
}
