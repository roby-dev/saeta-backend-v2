import { UnauthorizedException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import type { AccessTokenPayload } from '../application/commands/sign-in.command.js';
import { JwtStrategy } from './jwt.strategy.js';

describe('JwtStrategy', () => {
  const config = {
    getOrThrow: (key: string) => {
      if (key === 'JWT_SECRET') return 'super-secret-jwt-key-16-chars';
      throw new Error(`Unexpected key: ${key}`);
    },
  };

  const strategy = new JwtStrategy(config as never);

  it('validates and accepts standard access tokens', () => {
    const payload: AccessTokenPayload = {
      sub: 'user-1',
      email: 'admin@saeta.test',
      role: 'ADMIN',
      tokenType: 'access',
    };

    expect(strategy.validate(payload)).toEqual(payload);
  });

  it('validates and accepts tokens without explicit tokenType for backward compatibility', () => {
    const payload: AccessTokenPayload = {
      sub: 'user-1',
      email: 'admin@saeta.test',
      role: 'ADMIN',
    };

    expect(strategy.validate(payload)).toEqual(payload);
  });

  it('rejects tokens with tokenType === "refresh"', () => {
    const refreshPayload = {
      sub: 'user-1',
      email: 'admin@saeta.test',
      role: 'ADMIN' as const,
      tokenType: 'refresh',
    };

    expect(() => strategy.validate(refreshPayload as never)).toThrow(
      new UnauthorizedException('Refresh tokens cannot be used as access tokens'),
    );
  });
});
