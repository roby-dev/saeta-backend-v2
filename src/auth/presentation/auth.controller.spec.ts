import { describe, expect, it, vi } from 'vitest';
import { RefreshTokenCommand } from '../application/commands/refresh-token.command.js';
import { SignInCommand } from '../application/commands/sign-in.command.js';
import { GetCurrentUserQuery } from '../application/queries/get-current-user.query.js';
import { AuthController } from './auth.controller.js';

describe('AuthController', () => {
  it('delegates login request to SignInCommand', async () => {
    const commandBus = {
      execute: vi.fn().mockResolvedValue({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        user: { id: 'u1', email: 'test@saeta.test', role: 'ADMIN' },
      }),
    };
    const queryBus = { execute: vi.fn() };
    const controller = new AuthController(commandBus as never, queryBus as never);

    const result = await controller.signIn({
      email: 'test@saeta.test',
      password: 'password123',
    });

    expect(commandBus.execute).toHaveBeenCalledWith(
      new SignInCommand('test@saeta.test', 'password123'),
    );
    expect(result).toEqual({
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      user: { id: 'u1', email: 'test@saeta.test', role: 'ADMIN' },
    });
  });

  it('delegates refresh request to RefreshTokenCommand', async () => {
    const commandBus = {
      execute: vi.fn().mockResolvedValue({
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
        user: { id: 'u1', email: 'test@saeta.test', role: 'ADMIN' },
      }),
    };
    const queryBus = { execute: vi.fn() };
    const controller = new AuthController(commandBus as never, queryBus as never);

    const result = await controller.refreshToken({
      refreshToken: 'valid-refresh-token',
    });

    expect(commandBus.execute).toHaveBeenCalledWith(
      new RefreshTokenCommand('valid-refresh-token'),
    );
    expect(result).toEqual({
      accessToken: 'new-access-token',
      refreshToken: 'new-refresh-token',
      user: { id: 'u1', email: 'test@saeta.test', role: 'ADMIN' },
    });
  });

  it('delegates getCurrentUser to GetCurrentUserQuery', async () => {
    const commandBus = { execute: vi.fn() };
    const queryBus = {
      execute: vi.fn().mockResolvedValue({
        id: 'u1',
        email: 'test@saeta.test',
        role: 'ADMIN',
      }),
    };
    const controller = new AuthController(commandBus as never, queryBus as never);

    const result = await controller.getCurrentUser('u1');

    expect(queryBus.execute).toHaveBeenCalledWith(new GetCurrentUserQuery('u1'));
    expect(result).toEqual({
      id: 'u1',
      email: 'test@saeta.test',
      role: 'ADMIN',
    });
  });
});
