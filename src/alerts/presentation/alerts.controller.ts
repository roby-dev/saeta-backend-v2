import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import type { AccessTokenPayload } from '../../auth/application/commands/sign-in.command.js';
import { CurrentUser } from '../../auth/presentation/current-user.decorator.js';
import { JwtAuthGuard } from '../../auth/presentation/jwt-auth.guard.js';
import { Roles } from '../../auth/presentation/roles.decorator.js';
import { RolesGuard } from '../../auth/presentation/roles.guard.js';
import { CreateAlertCommand } from '../application/commands/create-alert.command.js';
import { DeletePendingAlertsCommand } from '../application/commands/delete-pending-alerts.command.js';
import { UpdateAlertFeedbackCommand } from '../application/commands/update-alert-feedback.command.js';
import { UpdateAlertCommand } from '../application/commands/update-alert.command.js';
import { GetAlertByIdQuery } from '../application/queries/get-alert-by-id.query.js';
import { GetAlertsByAttendedUserQuery } from '../application/queries/get-alerts-by-attended-user.query.js';
import { GetAlertsByUserQuery } from '../application/queries/get-alerts-by-user.query.js';
import {
  GetAlertsQuery,
  type GetAlertsResult,
} from '../application/queries/get-alerts.query.js';
import type { AlertEntity } from '../domain/alert.entity.js';
import { CreateAlertDto } from './dto/create-alert.dto.js';
import { GetAlertsQueryDto } from './dto/get-alerts-query.dto.js';
import { UpdateAlertFeedbackDto } from './dto/update-alert-feedback.dto.js';
import { UpdateAlertDto } from './dto/update-alert.dto.js';

@Controller('v1/alerts')
export class AlertsController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'BASE_SEGURIDAD', 'PERSONAL_SEGURIDAD')
  async getAlerts(
    @Query() query: GetAlertsQueryDto,
  ): Promise<{ ok: boolean } & GetAlertsResult> {
    const result: GetAlertsResult = await this.queryBus.execute(
      new GetAlertsQuery(query.page, query.limit, query.stateId, query.typeId),
    );
    return { ok: true, ...result };
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  async createAlert(
    @Body() dto: CreateAlertDto,
    @CurrentUser() user: AccessTokenPayload,
  ): Promise<{ ok: boolean; alerts: AlertEntity }> {
    const alert: AlertEntity = await this.commandBus.execute(
      new CreateAlertCommand(
        user.sub,
        user.role,
        dto.latitude,
        dto.longitude,
        dto.type,
        dto.id_user,
        dto.state,
      ),
    );
    return { ok: true, alerts: alert };
  }

  @Delete()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'BASE_SEGURIDAD')
  async deletePending(
    @CurrentUser() user: AccessTokenPayload,
  ): Promise<{ ok: boolean; deletedCount: number }> {
    const result: { deletedCount: number } = await this.commandBus.execute(
      new DeletePendingAlertsCommand(user.sub, user.role),
    );
    return { ok: true, deletedCount: result.deletedCount };
  }

  @Get('user/:id')
  @UseGuards(JwtAuthGuard)
  async getAlertsByUser(
    @Param('id') userId: string,
    @CurrentUser() user: AccessTokenPayload,
  ): Promise<{ ok: boolean; alerts: AlertEntity[]; total: number }> {
    const result: { alerts: AlertEntity[]; total: number } =
      await this.queryBus.execute(
        new GetAlertsByUserQuery(userId, user.sub, user.role),
      );
    return { ok: true, alerts: result.alerts, total: result.total };
  }

  @Get('attended/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'BASE_SEGURIDAD', 'PERSONAL_SEGURIDAD')
  async getAlertsByAttendedUser(
    @Param('id') attendedUserId: string,
    @CurrentUser() user: AccessTokenPayload,
  ): Promise<{ ok: boolean; alerts: AlertEntity[]; total: number }> {
    const result: { alerts: AlertEntity[]; total: number } =
      await this.queryBus.execute(
        new GetAlertsByAttendedUserQuery(attendedUserId, user.sub, user.role),
      );
    return { ok: true, alerts: result.alerts, total: result.total };
  }

  @Put('commentary/:id')
  @UseGuards(JwtAuthGuard)
  async updateCommentary(
    @Param('id') alertId: string,
    @Body() dto: UpdateAlertFeedbackDto,
    @CurrentUser() user: AccessTokenPayload,
  ): Promise<{ ok: boolean; alerts: AlertEntity }> {
    const alert: AlertEntity = await this.commandBus.execute(
      new UpdateAlertFeedbackCommand(
        alertId,
        user.sub,
        user.role,
        dto.commentary,
        dto.score,
      ),
    );
    return { ok: true, alerts: alert };
  }

  @Patch(':id/feedback')
  @UseGuards(JwtAuthGuard)
  async updateFeedback(
    @Param('id') alertId: string,
    @Body() dto: UpdateAlertFeedbackDto,
    @CurrentUser() user: AccessTokenPayload,
  ): Promise<{ ok: boolean; alerts: AlertEntity }> {
    return this.updateCommentary(alertId, dto, user);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async getAlertById(
    @Param('id') alertId: string,
  ): Promise<{ ok: boolean; alerts: AlertEntity }> {
    const alert: AlertEntity = await this.queryBus.execute(
      new GetAlertByIdQuery(alertId),
    );
    return { ok: true, alerts: alert };
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'BASE_SEGURIDAD', 'PERSONAL_SEGURIDAD')
  async updateAlertPut(
    @Param('id') alertId: string,
    @Body() dto: UpdateAlertDto,
    @CurrentUser() user: AccessTokenPayload,
  ): Promise<{ ok: boolean; alerts: AlertEntity }> {
    return this.updateAlert(alertId, dto, user);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'BASE_SEGURIDAD', 'PERSONAL_SEGURIDAD')
  async updateAlert(
    @Param('id') alertId: string,
    @Body() dto: UpdateAlertDto,
    @CurrentUser() user: AccessTokenPayload,
  ): Promise<{ ok: boolean; alerts: AlertEntity }> {
    const alert: AlertEntity = await this.commandBus.execute(
      new UpdateAlertCommand(alertId, user.sub, user.role, {
        stateId: dto.resolvedStateId,
        attendedById: dto.resolvedAttendedById,
        attentionDate: dto.attentionDate,
        culminationDate: dto.culminationDate,
        commentary: dto.commentary,
        score: dto.score,
      }),
    );
    return { ok: true, alerts: alert };
  }
}
