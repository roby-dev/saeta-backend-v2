import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import type { StringValue } from 'ms';
import type { AuthUserProfile } from '../../domain/auth-user.js';
import {
  AUTH_USER_REPOSITORY,
  type AuthUserRepository,
} from '../../domain/auth-user.repository.js';
import type { RefreshTokenPayload } from './refresh-token.command.js';
import type { AccessTokenPayload, SignInResult } from './sign-in.command.js';
import { SignInCommand } from './sign-in.command.js';

@Injectable()
@CommandHandler(SignInCommand)
export class SignInHandler implements ICommandHandler<SignInCommand, SignInResult> {
  constructor(
    @Inject(AUTH_USER_REPOSITORY)
    private readonly users: AuthUserRepository,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  async execute(command: SignInCommand): Promise<SignInResult> {
    const user = await this.users.findByEmail(command.email);
    const passwordMatches = user
      ? await bcrypt.compare(command.password, user.passwordHash)
      : false;

    if (!user || !passwordMatches || user.statusAccount === 'INHABILITADO') {
      throw new UnauthorizedException('Invalid credentials');
    }

    const accessSecret = this.config.getOrThrow<string>('JWT_SECRET');
    const accessExpiresIn = this.config.get<string>('JWT_EXPIRES_IN') ?? '15m';
    const refreshSecret =
      this.config.get<string>('JWT_REFRESH_SECRET') || accessSecret;
    const refreshExpiresIn = this.config.get<string>('JWT_REFRESH_EXPIRES_IN') ?? '1d';

    const accessPayload: AccessTokenPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      tokenType: 'access',
    };

    const refreshPayload: RefreshTokenPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      tokenType: 'refresh',
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(accessPayload, {
        secret: accessSecret,
        expiresIn: accessExpiresIn as StringValue,
      }),
      this.jwtService.signAsync(refreshPayload, {
        secret: refreshSecret,
        expiresIn: refreshExpiresIn as StringValue,
      }),
    ]);

    const userProfile: AuthUserProfile = {
      id: user.id,
      email: user.email,
      role: user.role,
    };
    if (user.name !== undefined) userProfile.name = user.name;
    if (user.lastname !== undefined) userProfile.lastname = user.lastname;
    if (user.dni !== undefined) userProfile.dni = user.dni;
    if (user.phone !== undefined) userProfile.phone = user.phone;
    if (user.image !== undefined) userProfile.image = user.image;
    if (user.statusAccount !== undefined) userProfile.statusAccount = user.statusAccount;
    if (user.availability !== undefined) userProfile.availability = user.availability;

    return {
      accessToken,
      refreshToken,
      user: userProfile,
    };
  }
}
