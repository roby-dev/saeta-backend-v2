import { UnauthorizedException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import type { AuthUserRepository } from '../../domain/auth-user.repository.js';
import { RefreshTokenCommand } from './refresh-token.command.js';
import { RefreshTokenHandler } from './refresh-token.handler.js';

describe('RefreshTokenHandler', () => {
  const userProfile = {
    id: 'user-uuid-1',
    email: 'officer@saeta.gob.pe',
    role: 'BASE_SEGURIDAD' as const,
    statusAccount: 'HABILITADO' as const,
  };

  const validPayload = {
    sub: 'user-uuid-1',
    email: 'officer@saeta.gob.pe',
    role: 'BASE_SEGURIDAD' as const,
    tokenType: 'refresh' as const,
  };

  const createMocks = () => {
    const users: AuthUserRepository = {
      findByEmail: vi.fn(),
      findProfileById: vi.fn().mockResolvedValue(userProfile),
    };
    const jwtService = {
      verifyAsync: vi.fn().mockResolvedValue(validPayload),
      signAsync: vi
        .fn()
        .mockResolvedValueOnce('renewed-access-token')
        .mockResolvedValueOnce('renewed-refresh-token'),
    };
    const config = {
      getOrThrow: vi.fn((key: string) => {
        if (key === 'JWT_SECRET') return 'super-secret-jwt-key-16-chars';
        throw new Error(`Unexpected key: ${key}`);
      }),
      get: vi.fn((key: string) => {
        if (key === 'JWT_REFRESH_SECRET') return 'refresh-secret-jwt-key-16-chars';
        if (key === 'JWT_EXPIRES_IN') return '15m';
        if (key === 'JWT_REFRESH_EXPIRES_IN') return '1d';
        return undefined;
      }),
    };
    return { users, jwtService, config };
  };

  it('rotates tokens and returns renewed token pair with user profile when valid', async () => {
    const { users, jwtService, config } = createMocks();
    const handler = new RefreshTokenHandler(users, jwtService as never, config as never);

    const result = await handler.execute(new RefreshTokenCommand('valid-refresh-token'));

    expect(result).toEqual({
      accessToken: 'renewed-access-token',
      refreshToken: 'renewed-refresh-token',
      user: userProfile,
    });

    expect(jwtService.verifyAsync).toHaveBeenCalledWith('valid-refresh-token', {
      secret: 'refresh-secret-jwt-key-16-chars',
    });
    expect(users.findProfileById).toHaveBeenCalledWith('user-uuid-1');
    expect(jwtService.signAsync).toHaveBeenCalledTimes(2);
    expect(jwtService.signAsync).toHaveBeenNthCalledWith(
      1,
      {
        sub: 'user-uuid-1',
        email: 'officer@saeta.gob.pe',
        role: 'BASE_SEGURIDAD',
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
        sub: 'user-uuid-1',
        email: 'officer@saeta.gob.pe',
        role: 'BASE_SEGURIDAD',
        tokenType: 'refresh',
      },
      {
        secret: 'refresh-secret-jwt-key-16-chars',
        expiresIn: '1d',
      },
    );
  });

  it('falls back to JWT_SECRET when JWT_REFRESH_SECRET is not configured', async () => {
    const { users, jwtService, config } = createMocks();
    config.get.mockImplementation((key: string) => {
      if (key === 'JWT_REFRESH_SECRET') return undefined;
      return undefined;
    });

    const handler = new RefreshTokenHandler(users, jwtService as never, config as never);
    await handler.execute(new RefreshTokenCommand('valid-refresh-token'));

    expect(jwtService.verifyAsync).toHaveBeenCalledWith('valid-refresh-token', {
      secret: 'super-secret-jwt-key-16-chars',
    });
  });

  it('rejects expired refresh token', async () => {
    const { users, jwtService, config } = createMocks();
    jwtService.verifyAsync.mockRejectedValue(new Error('jwt expired'));
    const handler = new RefreshTokenHandler(users, jwtService as never, config as never);

    await expect(
      handler.execute(new RefreshTokenCommand('expired-token')),
    ).rejects.toThrow(new UnauthorizedException('Invalid or expired refresh token'));
    expect(users.findProfileById).not.toHaveBeenCalled();
  });

  it('rejects invalid signature or corrupted token', async () => {
    const { users, jwtService, config } = createMocks();
    jwtService.verifyAsync.mockRejectedValue(new Error('invalid signature'));
    const handler = new RefreshTokenHandler(users, jwtService as never, config as never);

    await expect(
      handler.execute(new RefreshTokenCommand('corrupted-token')),
    ).rejects.toThrow(new UnauthorizedException('Invalid or expired refresh token'));
  });

  it('rejects token when tokenType is not refresh', async () => {
    const { users, jwtService, config } = createMocks();
    jwtService.verifyAsync.mockResolvedValue({
      ...validPayload,
      tokenType: 'access',
    });
    const handler = new RefreshTokenHandler(users, jwtService as never, config as never);

    await expect(
      handler.execute(new RefreshTokenCommand('access-token-as-refresh')),
    ).rejects.toThrow(new UnauthorizedException('Invalid token type'));
    expect(users.findProfileById).not.toHaveBeenCalled();
  });

  it('rejects when user no longer exists in repository', async () => {
    const { users, jwtService, config } = createMocks();
    users.findProfileById = vi.fn().mockResolvedValue(null);
    const handler = new RefreshTokenHandler(users, jwtService as never, config as never);

    await expect(
      handler.execute(new RefreshTokenCommand('valid-refresh-token')),
    ).rejects.toThrow(new UnauthorizedException('User no longer exists'));
  });

  it('rejects when user account is disabled (INHABILITADO)', async () => {
    const { users, jwtService, config } = createMocks();
    users.findProfileById = vi.fn().mockResolvedValue({
      ...userProfile,
      statusAccount: 'INHABILITADO',
    });
    const handler = new RefreshTokenHandler(users, jwtService as never, config as never);

    await expect(
      handler.execute(new RefreshTokenCommand('valid-refresh-token')),
    ).rejects.toThrow(new UnauthorizedException('User account is disabled'));
    expect(jwtService.signAsync).not.toHaveBeenCalled();
  });
});
