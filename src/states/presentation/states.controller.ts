import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { JwtAuthGuard } from '../../auth/presentation/jwt-auth.guard.js';
import { Roles } from '../../auth/presentation/roles.decorator.js';
import { RolesGuard } from '../../auth/presentation/roles.guard.js';
import { CreateStateCommand } from '../application/commands/create-state.command.js';
import { UpdateStateCommand } from '../application/commands/update-state.command.js';
import { GetStateByIdQuery } from '../application/queries/get-state-by-id.query.js';
import { GetStatesQuery } from '../application/queries/get-states.query.js';
import type { StateEntity } from '../domain/state.entity.js';
import { CreateStateDto } from './dto/create-state.dto.js';
import { UpdateStateDto } from './dto/update-state.dto.js';

@Controller('v1/states')
export class StatesController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  async getStates(): Promise<{ ok: boolean; states: StateEntity[]; total: number }> {
    const result: { states: StateEntity[]; total: number } =
      await this.queryBus.execute(new GetStatesQuery());
    return { ok: true, ...result };
  }

  @Get('id/:id')
  @UseGuards(JwtAuthGuard)
  async getStateByIdLegacy(
    @Param('id') id: string,
  ): Promise<{ ok: boolean; state: StateEntity }> {
    return this.getStateById(id);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async getStateById(
    @Param('id') id: string,
  ): Promise<{ ok: boolean; state: StateEntity }> {
    const state: StateEntity = await this.queryBus.execute(
      new GetStateByIdQuery(id),
    );
    return { ok: true, state };
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'BASE_SEGURIDAD')
  @HttpCode(HttpStatus.CREATED)
  async createState(
    @Body() dto: CreateStateDto,
  ): Promise<{ ok: boolean; state: StateEntity }> {
    const state: StateEntity = await this.commandBus.execute(
      new CreateStateCommand(dto.name),
    );
    return { ok: true, state };
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'BASE_SEGURIDAD')
  async updateStatePut(
    @Param('id') id: string,
    @Body() dto: UpdateStateDto,
  ): Promise<{ ok: boolean; state: StateEntity }> {
    return this.updateState(id, dto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'BASE_SEGURIDAD')
  async updateState(
    @Param('id') id: string,
    @Body() dto: UpdateStateDto,
  ): Promise<{ ok: boolean; state: StateEntity }> {
    const state: StateEntity = await this.commandBus.execute(
      new UpdateStateCommand(id, dto.name),
    );
    return { ok: true, state };
  }
}
