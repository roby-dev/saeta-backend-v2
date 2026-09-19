import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { JwtAuthGuard } from '../../auth/presentation/jwt-auth.guard.js';
import { Roles } from '../../auth/presentation/roles.decorator.js';
import { RolesGuard } from '../../auth/presentation/roles.guard.js';
import { GetDashboardOverviewQuery } from '../application/queries/get-dashboard-overview.query.js';
import type { DashboardOverviewDto } from './dto/dashboard-overview.dto.js';

@Controller('v1/dashboard')
export class DashboardController {
  constructor(private readonly queryBus: QueryBus) {}

  @Get('overview')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'BASE_SEGURIDAD')
  async getOverview(
    @Query('year') yearParam?: string,
  ): Promise<{ ok: boolean; data: DashboardOverviewDto }> {
    const year = yearParam ? parseInt(yearParam, 10) : new Date().getFullYear();
    const data = await this.queryBus.execute<GetDashboardOverviewQuery, DashboardOverviewDto>(
      new GetDashboardOverviewQuery(isNaN(year) ? new Date().getFullYear() : year),
    );

    return { ok: true, data };
  }
}
