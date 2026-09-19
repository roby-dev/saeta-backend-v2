import { UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { describe, expect, it, vi } from 'vitest';
import type { AuthUserRepository } from '../../domain/auth-user.repository.js';
import { SignInCommand } from './sign-in.command.js';
import { SignInHandler } from './sign-in.handler.js';

describe('SignInHandler', () => {
  const password = 'correct-password';

  it('issues a token for an enabled user with valid credentials', async () => {
    const users: AuthUserRepository = {
      findByEmail: vi.fn().mockResolvedValue({
        id: 'user-id',
        email: 'admin@saeta.test',
        passwordHash: await bcrypt.hash(password, 4),
        role: 'ADMIN',
        statusAccount: 'HABILITADO',
      }),
      findProfileById: vi.fn(),
    };
    const jwtService = { signAsync: vi.fn().mockResolvedValue('signed-token') };
    const handler = new SignInHandler(users, jwtService as never);

    await expect(
      handler.execute(new SignInCommand('admin@saeta.test', password)),
    ).resolves.toEqual({
      accessToken: 'signed-token',
      user: { id: 'user-id', email: 'admin@saeta.test', role: 'ADMIN' },
    });
    expect(jwtService.signAsync).toHaveBeenCalledWith({
      sub: 'user-id',
      email: 'admin@saeta.test',
      role: 'ADMIN',
    });
  });

  it('rejects invalid credentials without issuing a token', async () => {
    const users: AuthUserRepository = {
      findByEmail: vi.fn().mockResolvedValue(null),
      findProfileById: vi.fn(),
    };
    const jwtService = { signAsync: vi.fn() };
    const handler = new SignInHandler(users, jwtService as never);

    await expect(
      handler.execute(new SignInCommand('missing@saeta.test', password)),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(jwtService.signAsync).not.toHaveBeenCalled();
  });
});
