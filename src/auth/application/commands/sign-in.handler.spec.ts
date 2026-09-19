import { UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { describe, expect, it, vi } from 'vitest';
import type { AuthUserRepository } from '../../domain/auth-user.repository.js';
import { SignInCommand } from './sign-in.command.js';
import { SignInHandler } from './sign-in.handler.js';

describe('SignInHandler', () => {
  const password = 'correct-password';

  it('issues both access and refresh tokens for an enabled user with valid credentials', async () => {
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
    const jwtService = {
      signAsync: vi
        .fn()
        .mockResolvedValueOnce('signed-access-token')
        .mockResolvedValueOnce('signed-refresh-token'),
    };
    const config = {
      getOrThrow: vi.fn((key: string) => {
        if (key === 'JWT_SECRET') return 'super-secret-jwt-key-16-chars';
        throw new Error(`Unexpected key: ${key}`);
      }),
      get: vi.fn((key: string) => {
        if (key === 'JWT_EXPIRES_IN') return '15m';
        if (key === 'JWT_REFRESH_SECRET') return 'refresh-secret-jwt-key-16-chars';
        if (key === 'JWT_REFRESH_EXPIRES_IN') return '1d';
        return undefined;
      }),
    };
    const handler = new SignInHandler(users, jwtService as never, config as never);

    await expect(
      handler.execute(new SignInCommand('admin@saeta.test', password)),
    ).resolves.toEqual({
      accessToken: 'signed-access-token',
      refreshToken: 'signed-refresh-token',
      user: { id: 'user-id', email: 'admin@saeta.test', role: 'ADMIN', statusAccount: 'HABILITADO' },
    });

    expect(jwtService.signAsync).toHaveBeenCalledTimes(2);
    expect(jwtService.signAsync).toHaveBeenNthCalledWith(
      1,
      {
        sub: 'user-id',
        email: 'admin@saeta.test',
        role: 'ADMIN',
        tokenType: 'access',
      },
      {
        secret: 'super-secret-jwt-key-16-chars',
        expiresIn: '15m',
      },
    );
    expect(jwtService.signAsync).toHaveBeenNthCalledWith(
      2,
      {
        sub: 'user-id',
        email: 'admin@saeta.test',
        role: 'ADMIN',
        tokenType: 'refresh',
      },
      {
        secret: 'refresh-secret-jwt-key-16-chars',
        expiresIn: '1d',
      },
    );
  });

  it('rejects invalid credentials without issuing tokens', async () => {
    const users: AuthUserRepository = {
      findByEmail: vi.fn().mockResolvedValue(null),
      findProfileById: vi.fn(),
    };
    const jwtService = { signAsync: vi.fn() };
    const config = {
      getOrThrow: vi.fn(),
      get: vi.fn(),
    };
    const handler = new SignInHandler(users, jwtService as never, config as never);

    await expect(
      handler.execute(new SignInCommand('missing@saeta.test', password)),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(jwtService.signAsync).not.toHaveBeenCalled();
  });
});
