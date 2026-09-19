import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { AccessTokenPayload } from '../application/commands/sign-in.command.js';

export const CurrentUser = createParamDecorator(
  (field: keyof AccessTokenPayload | undefined, context: ExecutionContext) => {
    const request = context.switchToHttp().getRequest<{ user?: AccessTokenPayload }>();
    return field ? request.user?.[field] : request.user;
  },
);
