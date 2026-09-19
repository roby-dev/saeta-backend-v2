import { Inject, UnauthorizedException } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import type { AuthUserProfile } from '../../domain/auth-user.js';
import {
  AUTH_USER_REPOSITORY,
  type AuthUserRepository,
} from '../../domain/auth-user.repository.js';
import type { AccessTokenPayload, SignInResult } from './sign-in.command.js';
import { SignInCommand } from './sign-in.command.js';

@CommandHandler(SignInCommand)
export class SignInHandler implements ICommandHandler<SignInCommand, SignInResult> {
  constructor(
    @Inject(AUTH_USER_REPOSITORY)
    private readonly users: AuthUserRepository,
    private readonly jwtService: JwtService,
  ) {}

  async execute(command: SignInCommand): Promise<SignInResult> {
    const user = await this.users.findByEmail(command.email);
    const passwordMatches = user
      ? await bcrypt.compare(command.password, user.passwordHash)
      : false;

    if (!user || !passwordMatches || user.statusAccount === 'INHABILITADO') {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload: AccessTokenPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

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
      accessToken: await this.jwtService.signAsync(payload),
      user: userProfile,
    };
  }
}
