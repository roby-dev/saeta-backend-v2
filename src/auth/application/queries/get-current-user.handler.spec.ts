import { UnauthorizedException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import type { AuthUserRepository } from '../../domain/auth-user.repository.js';
import { GetCurrentUserHandler } from './get-current-user.handler.js';
import { GetCurrentUserQuery } from './get-current-user.query.js';

describe('GetCurrentUserHandler', () => {
  it('returns the safe profile for the authenticated user', async () => {
    const users: AuthUserRepository = {
      findByEmail: vi.fn(),
      findProfileById: vi.fn().mockResolvedValue({
        id: 'user-id',
        email: 'operator@saeta.test',
        role: 'PERSONAL_SEGURIDAD',
      }),
    };
    const handler = new GetCurrentUserHandler(users);

    await expect(handler.execute(new GetCurrentUserQuery('user-id'))).resolves.toEqual({
      id: 'user-id',
      email: 'operator@saeta.test',
      role: 'PERSONAL_SEGURIDAD',
    });
  });

  it('rejects a token for a user that no longer exists', async () => {
    const users: AuthUserRepository = {
      findByEmail: vi.fn(),
      findProfileById: vi.fn().mockResolvedValue(null),
    };
    const handler = new GetCurrentUserHandler(users);

    await expect(handler.execute(new GetCurrentUserQuery('deleted-user'))).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });
});
