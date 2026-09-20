import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import type { Request } from 'express';
import type { AccessTokenPayload } from '../../auth/application/commands/sign-in.command.js';
import { CurrentUser } from '../../auth/presentation/current-user.decorator.js';
import { JwtAuthGuard } from '../../auth/presentation/jwt-auth.guard.js';
import { Roles } from '../../auth/presentation/roles.decorator.js';
import { RolesGuard } from '../../auth/presentation/roles.guard.js';
import { ChangePasswordCommand } from '../application/commands/change-password.command.js';
import { CreateUserCommand } from '../application/commands/create-user.command.js';
import { UpdateUserCommand } from '../application/commands/update-user.command.js';
import { VerifyPasswordCommand } from '../application/commands/verify-password.command.js';
import { GetSecurityPersonnelQuery } from '../application/queries/get-security-personnel.query.js';
import { GetUserByIdQuery } from '../application/queries/get-user-by-id.query.js';
import {
  GetUsersQuery,
  type GetUsersResult,
} from '../application/queries/get-users.query.js';
import { LookupDniQuery } from '../application/queries/lookup-dni.query.js';
import type { LookupDniResult } from '../application/queries/lookup-dni.handler.js';
import type { UserEntity } from '../domain/user.entity.js';
import { ChangePasswordDto } from './dto/change-password.dto.js';
import { CreateUserDto } from './dto/create-user.dto.js';
import { GetUsersQueryDto } from './dto/get-users-query.dto.js';
import { UpdateUserDto } from './dto/update-user.dto.js';
import { VerifyPasswordDto } from './dto/verify-password.dto.js';

interface AuthenticatedRequest extends Request {
  user?: AccessTokenPayload;
}

@Controller('v1/users')
export class UsersController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createUser(
    @Body() dto: CreateUserDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<{ ok: boolean; user: UserEntity }> {
    const creatorRole = req.user?.role;

    const user = await this.commandBus.execute(
      new CreateUserCommand(
        dto.name,
        dto.lastname,
        dto.dni,
        dto.phone,
        dto.email,
        dto.password,
        dto.role,
        creatorRole,
        dto.emergencyContacts,
        dto.image,
      ),
    );

    return { ok: true, user };
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'BASE_SEGURIDAD')
  async getUsers(
    @Query() query: GetUsersQueryDto,
  ): Promise<{ ok: boolean } & GetUsersResult> {
    const result: GetUsersResult = await this.queryBus.execute(
      new GetUsersQuery(
        query.page,
        query.limit,
        query.role,
        query.statusAccount,
        query.search,
      ),
    );

    return { ok: true, ...result };
  }


  @Get('all')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'BASE_SEGURIDAD')
  async getAllUsers(): Promise<{ ok: boolean; users: UserEntity[] }> {
    const result: GetUsersResult = await this.queryBus.execute(
      new GetUsersQuery(1, 1000),
    );
    return { ok: true, users: result.users };
  }

  @Get('personal/all')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'BASE_SEGURIDAD')
  async getPersonalUsers(): Promise<{ ok: boolean; users: UserEntity[] }> {
    const users: UserEntity[] = await this.queryBus.execute(
      new GetSecurityPersonnelQuery(),
    );
    return { ok: true, users };
  }

  @Get('security-personnel')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'BASE_SEGURIDAD')
  async getSecurityPersonnel(): Promise<{ ok: boolean; users: UserEntity[] }> {
    const users: UserEntity[] = await this.queryBus.execute(
      new GetSecurityPersonnelQuery(),
    );
    return { ok: true, users };
  }

  @Get('active/personal')
  @UseGuards(JwtAuthGuard)
  getActivePersonalUsers(): { activePersonal: string[] } {
    return { activePersonal: [] };
  }

  @Get('dni/:dni')
  async lookupDni(
    @Param('dni') dni: string,
  ): Promise<LookupDniResult> {
    return this.queryBus.execute(new LookupDniQuery(dni));
  }

  @Get('id/:id')
  @UseGuards(JwtAuthGuard)
  async getUserByIdLegacy(
    @Param('id') id: string,
    @CurrentUser() user: AccessTokenPayload,
  ): Promise<{ ok: boolean; user: UserEntity }> {
    return this.getUserById(id, user);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async getUserById(
    @Param('id') id: string,
    @CurrentUser() user: AccessTokenPayload,
  ): Promise<{ ok: boolean; user: UserEntity }> {
    const foundUser: UserEntity = await this.queryBus.execute(
      new GetUserByIdQuery(id, user.sub, user.role),
    );
    return { ok: true, user: foundUser };
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  async updateUserPut(
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser() user: AccessTokenPayload,
  ): Promise<{ ok: boolean; user: UserEntity }> {
    return this.updateUser(id, dto, user);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  async updateUser(
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser() user: AccessTokenPayload,
  ): Promise<{ ok: boolean; user: UserEntity }> {
    const updatedUser: UserEntity = await this.commandBus.execute(
      new UpdateUserCommand(id, user.sub, user.role, dto),
    );
    return { ok: true, user: updatedUser };
  }

  @Post('change')
  @UseGuards(JwtAuthGuard)
  async changePasswordLegacy(
    @Body() dto: ChangePasswordDto,
    @CurrentUser() user: AccessTokenPayload,
  ): Promise<{ ok: boolean }> {
    const targetUserId = dto._id ?? user.sub;
    const newPassword = dto.resolvedPassword;

    if (!newPassword || newPassword.length < 6) {
      throw new BadRequestException('New password must have at least 6 characters');
    }

    const result = await this.commandBus.execute(
      new ChangePasswordCommand(
        targetUserId,
        user.sub,
        user.role,
        newPassword,
        dto.currentPassword,
      ),
    );

    return { ok: result.success };
  }

  @Patch(':id/password')
  @UseGuards(JwtAuthGuard)
  async changePassword(
    @Param('id') id: string,
    @Body() dto: ChangePasswordDto,
    @CurrentUser() user: AccessTokenPayload,
  ): Promise<{ ok: boolean }> {
    const newPassword = dto.resolvedPassword;
    if (!newPassword || newPassword.length < 6) {
      throw new BadRequestException('New password must have at least 6 characters');
    }

    const result = await this.commandBus.execute(
      new ChangePasswordCommand(
        id,
        user.sub,
        user.role,
        newPassword,
        dto.currentPassword,
      ),
    );

    return { ok: result.success };
  }

  @Post('pass')
  @UseGuards(JwtAuthGuard)
  async verifyPassword(
    @Body() dto: VerifyPasswordDto,
    @CurrentUser() user: AccessTokenPayload,
  ): Promise<{ ok: boolean; msg: string }> {
    const targetUserId = dto._id ?? user.sub;
    return this.commandBus.execute(
      new VerifyPasswordCommand(targetUserId, user.sub, user.role, dto.password),
    );
  }
}
