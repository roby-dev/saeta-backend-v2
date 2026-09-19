import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { JwtAuthGuard } from '../../auth/presentation/jwt-auth.guard.js';
import { Roles } from '../../auth/presentation/roles.decorator.js';
import { RolesGuard } from '../../auth/presentation/roles.guard.js';
import { CreateTempCommand } from '../application/commands/create-temp.command.js';
import { DeleteTempCommand } from '../application/commands/delete-temp.command.js';
import { GetTempByIdQuery } from '../application/queries/get-temp-by-id.query.js';
import { GetTempByUserQuery } from '../application/queries/get-temp-by-user.query.js';
import { GetTempsQuery } from '../application/queries/get-temps.query.js';
import type { TempEntity } from '../domain/temp.entity.js';
import { CreateTempDto } from './dto/create-temp.dto.js';

@Controller('v1/temps')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'BASE_SEGURIDAD')
export class TempsController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Get()
  async getTemps(): Promise<{ ok: boolean; temps: TempEntity[]; total: number }> {
    const result: { temps: TempEntity[]; total: number } =
      await this.queryBus.execute(new GetTempsQuery());
    return { ok: true, ...result };
  }

  @Get('user/:userId')
  async getTempByUser(
    @Param('userId') userId: string,
  ): Promise<{ ok: boolean; temp?: TempEntity; msg?: string }> {
    const temp: TempEntity | null = await this.queryBus.execute(
      new GetTempByUserQuery(userId),
    );
    if (!temp) {
      return { ok: false, msg: 'No se encontro temporal.' };
    }
    return { ok: true, temp };
  }

  @Get(':id')
  async getTempByIdOrUser(
    @Param('id') id: string,
  ): Promise<{ ok: boolean; temp?: TempEntity; msg?: string }> {
    // Legacy compatibility: GET /api/temps/:id searched by user ID
    let temp: TempEntity | null = await this.queryBus.execute(
      new GetTempByUserQuery(id),
    );

    if (!temp) {
      try {
        temp = await this.queryBus.execute(new GetTempByIdQuery(id));
      } catch {
        temp = null;
      }
    }

    if (!temp) {
      return { ok: false, msg: 'No se encontro temporal.' };
    }
    return { ok: true, temp };
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createTemp(
    @Body() dto: CreateTempDto,
  ): Promise<{ ok: boolean; temp: TempEntity }> {
    const temp: TempEntity = await this.commandBus.execute(
      new CreateTempCommand(dto.user, dto.tempPassword, dto.date),
    );
    return { ok: true, temp };
  }

  @Delete(':id')
  async deleteTemp(
    @Param('id') id: string,
  ): Promise<{ ok: boolean; msg: string }> {
    const result: { success: boolean; message: string } =
      await this.commandBus.execute(new DeleteTempCommand(id));
    return { ok: result.success, msg: result.message };
  }
}
