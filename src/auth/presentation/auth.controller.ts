import { Body, Controller, Get, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import {
  RefreshTokenCommand,
  type RefreshTokenResult,
} from '../application/commands/refresh-token.command.js';
import { SignInCommand, type SignInResult } from '../application/commands/sign-in.command.js';
import {
  GetCurrentUserQuery,
  type GetCurrentUserResult,
} from '../application/queries/get-current-user.query.js';
import { CurrentUser } from './current-user.decorator.js';
import { RefreshTokenDto } from './dto/refresh-token.dto.js';
import { SignInDto } from './dto/sign-in.dto.js';
import { JwtAuthGuard } from './jwt-auth.guard.js';

@Controller('v1/auth')
export class AuthController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async signIn(@Body() body: SignInDto): Promise<SignInResult> {
    return this.commandBus.execute(new SignInCommand(body.email, body.password));
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refreshToken(@Body() body: RefreshTokenDto): Promise<RefreshTokenResult> {
    return this.commandBus.execute(new RefreshTokenCommand(body.refreshToken));
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getCurrentUser(@CurrentUser('sub') userId: string): Promise<GetCurrentUserResult> {
    return this.queryBus.execute(new GetCurrentUserQuery(userId));
  }
}
