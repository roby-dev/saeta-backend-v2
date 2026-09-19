import { type CanActivate, type ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { AccessTokenPayload } from '../application/commands/sign-in.command.js';
import type { UserRole } from '../domain/auth-user.js';
import { ROLES_KEY } from './roles.decorator.js';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const allowedRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!allowedRoles) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{ user?: AccessTokenPayload }>();
    return Boolean(request.user && allowedRoles.includes(request.user.role));
  }
}
