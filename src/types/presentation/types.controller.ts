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
  Query,
  UseGuards,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { JwtAuthGuard } from '../../auth/presentation/jwt-auth.guard.js';
import { Roles } from '../../auth/presentation/roles.decorator.js';
import { RolesGuard } from '../../auth/presentation/roles.guard.js';
import { CreateTypeCommand } from '../application/commands/create-type.command.js';
import { UpdateTypeCommand } from '../application/commands/update-type.command.js';
import { GetTypeByIdQuery } from '../application/queries/get-type-by-id.query.js';
import { GetTypesQuery } from '../application/queries/get-types.query.js';
import type { TypeEntity } from '../domain/type.entity.js';
import { CreateTypeDto } from './dto/create-type.dto.js';
import { UpdateTypeDto } from './dto/update-type.dto.js';

@Controller('v1/types')
export class TypesController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  async getTypes(
    @Query('desde') desde?: number,
  ): Promise<{ ok: boolean; types: TypeEntity[]; total: number }> {
    const skip = desde ? Number(desde) : undefined;
    const result: { types: TypeEntity[]; total: number } =
      await this.queryBus.execute(new GetTypesQuery(skip, 100));
    return { ok: true, ...result };
  }

  @Get('id/:id')
  @UseGuards(JwtAuthGuard)
  async getTypeByIdLegacy(
    @Param('id') id: string,
  ): Promise<{ ok: boolean; type: TypeEntity }> {
    return this.getTypeById(id);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async getTypeById(
    @Param('id') id: string,
  ): Promise<{ ok: boolean; type: TypeEntity }> {
    const type: TypeEntity = await this.queryBus.execute(
      new GetTypeByIdQuery(id),
    );
    return { ok: true, type };
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'BASE_SEGURIDAD')
  @HttpCode(HttpStatus.CREATED)
  async createType(
    @Body() dto: CreateTypeDto,
  ): Promise<{ ok: boolean; type: TypeEntity }> {
    const type: TypeEntity = await this.commandBus.execute(
      new CreateTypeCommand(dto.name, dto.priority),
    );
    return { ok: true, type };
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'BASE_SEGURIDAD')
  async updateTypePut(
    @Param('id') id: string,
    @Body() dto: UpdateTypeDto,
  ): Promise<{ ok: boolean; type: TypeEntity }> {
    return this.updateType(id, dto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'BASE_SEGURIDAD')
  async updateType(
    @Param('id') id: string,
    @Body() dto: UpdateTypeDto,
  ): Promise<{ ok: boolean; type: TypeEntity }> {
    const type: TypeEntity = await this.commandBus.execute(
      new UpdateTypeCommand(id, dto.name, dto.priority),
    );
    return { ok: true, type };
  }
}
