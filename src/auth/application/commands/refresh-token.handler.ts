import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import { JwtService } from '@nestjs/jwt';
import type { StringValue } from 'ms';
import {
  AUTH_USER_REPOSITORY,
  type AuthUserRepository,
} from '../../domain/auth-user.repository.js';
import {
  RefreshTokenCommand,
  type RefreshTokenPayload,
  type RefreshTokenResult,
} from './refresh-token.command.js';
import type { AccessTokenPayload } from './sign-in.command.js';

@Injectable()
@CommandHandler(RefreshTokenCommand)
export class RefreshTokenHandler
  implements ICommandHandler<RefreshTokenCommand, RefreshTokenResult>
{
  constructor(
    @Inject(AUTH_USER_REPOSITORY)
    private readonly users: AuthUserRepository,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  async execute(command: RefreshTokenCommand): Promise<RefreshTokenResult> {
    const refreshSecret =
      this.config.get<string>('JWT_REFRESH_SECRET') ||
      this.config.getOrThrow<string>('JWT_SECRET');

    let payload: RefreshTokenPayload;
    try {
      payload = await this.jwtService.verifyAsync<RefreshTokenPayload>(
        command.refreshToken,
        { secret: refreshSecret },
      );
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    if (payload.tokenType !== 'refresh') {
      throw new UnauthorizedException('Invalid token type');
    }

    const userProfile = await this.users.findProfileById(payload.sub);
    if (!userProfile) {
      throw new UnauthorizedException('User no longer exists');
    }

    if (userProfile.statusAccount === 'INHABILITADO') {
      throw new UnauthorizedException('User account is disabled');
    }

    const accessSecret = this.config.getOrThrow<string>('JWT_SECRET');
    const accessExpiresIn = this.config.get<string>('JWT_EXPIRES_IN') ?? '15m';
    const refreshExpiresIn = this.config.get<string>('JWT_REFRESH_EXPIRES_IN') ?? '1d';

    const accessPayload: AccessTokenPayload = {
      sub: userProfile.id,
      email: userProfile.email,
      role: userProfile.role,
      tokenType: 'access',
    };

    const newRefreshPayload: RefreshTokenPayload = {
      sub: userProfile.id,
      email: userProfile.email,
      role: userProfile.role,
      tokenType: 'refresh',
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(accessPayload, {
        secret: accessSecret,
        expiresIn: accessExpiresIn as StringValue,
      }),
      this.jwtService.signAsync(newRefreshPayload, {
        secret: refreshSecret,
        expiresIn: refreshExpiresIn as StringValue,
      }),
    ]);

    return {
      accessToken,
      refreshToken,
      user: userProfile,
    };
  }
}
