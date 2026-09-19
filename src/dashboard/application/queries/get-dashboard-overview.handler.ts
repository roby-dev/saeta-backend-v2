import { Injectable } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Alert } from '../../../alerts/infrastructure/persistence/alert.schema.js';
import { State } from '../../../states/infrastructure/persistence/state.schema.js';
import { Type } from '../../../types/infrastructure/persistence/type.schema.js';
import { User } from '../../../users/infrastructure/persistence/user.schema.js';
import type {
  AverageTimesMetricsDto,
  DashboardOverviewDto,
  RecentCommentaryDto,
  StateMetricsDto,
  TypeDistributionDto,
  UserRoleMetricsDto,
} from '../../presentation/dto/dashboard-overview.dto.js';
import { GetDashboardOverviewQuery } from './get-dashboard-overview.query.js';

export function parseAlertDate(dateStr?: string | Date): Date | null {
  if (!dateStr) return null;
  if (dateStr instanceof Date) return dateStr;
  if (typeof dateStr === 'string' && dateStr.includes('/')) {
    const [datePart, timePart = '00:00:00'] = dateStr.split(',');
    const parts = datePart.split('/').map(Number);
    if (parts.length === 3) {
      const [d, m, y] = parts;
      const [h = 0, min = 0, s = 0] = timePart.split(':').map(Number);
      return new Date(y, m - 1, d, h, min, s);
    }
  }
  const parsed = new Date(dateStr);
  return isNaN(parsed.getTime()) ? null : parsed;
}

export function formatDurationSeconds(seconds: number): string {
  if (!seconds || isNaN(seconds) || seconds <= 0) return '0 min 0 seg';
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  return `${mins} min ${secs} seg`;
}

interface PopulatedCommentUser {
  _id: Types.ObjectId;
  name: string;
  lastname?: string;
  image?: string;
}

interface LeanAlertCommentDoc {
  _id: Types.ObjectId;
  commentary?: string;
  score?: number;
  creationDate: string;
  id_user?: PopulatedCommentUser;
}

@QueryHandler(GetDashboardOverviewQuery)
@Injectable()
export class GetDashboardOverviewHandler
  implements IQueryHandler<GetDashboardOverviewQuery, DashboardOverviewDto>
{
  constructor(
    @InjectModel(Alert.name) private readonly alertModel: Model<Alert>,
    @InjectModel(User.name) private readonly userModel: Model<User>,
    @InjectModel(State.name) private readonly stateModel: Model<State>,
    @InjectModel(Type.name) private readonly typeModel: Model<Type>,
  ) {}

  async execute(query: GetDashboardOverviewQuery): Promise<DashboardOverviewDto> {
    const targetYear = query.year;

    // 1. Parallel Aggregations: Users by Role, All States, All Types, Alert Counts by State and Type
    const [
      userRoleAgg,
      statesList,
      typesList,
      alertsByStateAgg,
      alertsByTypeAgg,
      allDateAlerts,
      recentCommentsDocs,
    ] = await Promise.all([
      // Users grouped by role
      this.userModel.aggregate<{ _id: string; count: number }>([
        { $group: { _id: '$role', count: { $sum: 1 } } },
      ]),

      // All states catalogue
      this.stateModel.find().lean().exec(),

      // All alert types catalogue
      this.typeModel.find().sort({ priority: 1, name: 1 }).lean().exec(),

      // Alerts aggregated by state ID
      this.alertModel.aggregate<{ _id: Types.ObjectId; count: number }>([
        { $group: { _id: '$state', count: { $sum: 1 } } },
      ]),

      // Alerts aggregated by type ID
      this.alertModel.aggregate<{ _id: Types.ObjectId; count: number }>([
        { $group: { _id: '$type', count: { $sum: 1 } } },
      ]),

      // Alerts dates for average time and monthly series computation
      this.alertModel
        .find({}, 'creationDate attentionDate culminationDate createdAt')
        .lean()
        .exec(),

      // 5 most recent alerts with citizen commentary
      this.alertModel
        .find({
          commentary: {
            $exists: true,
            $nin: ['', 'No hay comentario registrado', null],
          },
        })
        .sort({ createdAt: -1, _id: -1 })
        .limit(5)
        .populate<{ id_user: PopulatedCommentUser }>('id_user', 'name lastname image')
        .lean()
        .exec() as Promise<LeanAlertCommentDoc[]>,
    ]);

    // 2. Build User Role Metrics
    const userRoleCounts: Record<string, number> = {};
    let totalUsers = 0;
    for (const item of userRoleAgg) {
      userRoleCounts[item._id] = item.count;
      totalUsers += item.count;
    }

    const users: UserRoleMetricsDto = {
      admin: userRoleCounts['ADMIN'] ?? 0,
      baseSecurity: userRoleCounts['BASE_SEGURIDAD'] ?? 0,
      securityPersonnel: userRoleCounts['PERSONAL_SEGURIDAD'] ?? 0,
      citizen: userRoleCounts['CIUDADANO'] ?? 0,
      total: totalUsers,
    };

    // 3. Build State Metrics
    const stateCountMap = new Map<string, number>();
    for (const item of alertsByStateAgg) {
      if (item._id) {
        stateCountMap.set(item._id.toString(), item.count);
      }
    }

    let pending = 0;
    let inProcess = 0;
    let resolved = 0;
    let rejected = 0;
    let totalAlerts = 0;

    for (const st of statesList) {
      const count = stateCountMap.get(st._id.toString()) ?? 0;
      totalAlerts += count;
      const upperName = st.name.toUpperCase();

      if (upperName.includes('PENDIENTE')) {
        pending += count;
      } else if (upperName.includes('PROCESO')) {
        inProcess += count;
      } else if (upperName.includes('RESUELT')) {
        resolved += count;
      } else if (upperName.includes('RECHAZAD') || upperName.includes('CANCELAD')) {
        rejected += count;
      }
    }

    const states: StateMetricsDto = {
      pending,
      inProcess,
      resolved,
      rejected,
      total: totalAlerts,
    };

    // 4. Build Type Distribution Metrics
    const typeCountMap = new Map<string, number>();
    for (const item of alertsByTypeAgg) {
      if (item._id) {
        typeCountMap.set(item._id.toString(), item.count);
      }
    }

    const typesDistribution: TypeDistributionDto[] = typesList.map((tp) => {
      const count = typeCountMap.get(tp._id.toString()) ?? 0;
      const percentage = totalAlerts > 0 ? Number(((count * 100) / totalAlerts).toFixed(1)) : 0;
      return {
        id: tp._id.toString(),
        name: tp.name,
        count,
        percentage,
      };
    });

    // 5. Build Average Durations and Monthly Series
    let totalAttentionSeconds = 0;
    let attentionCount = 0;
    let totalResolutionSeconds = 0;
    let resolutionCount = 0;
    let totalElapsedSeconds = 0;
    let totalElapsedCount = 0;

    const monthlySeries = new Array<number>(12).fill(0);

    for (const alert of allDateAlerts) {
      const created = parseAlertDate(alert.creationDate);

      // Monthly series
      if (created && created.getFullYear() === targetYear) {
        const month = created.getMonth();
        if (month >= 0 && month < 12) {
          monthlySeries[month]++;
        }
      }

      // Attention time: attentionDate - creationDate
      if (alert.attentionDate && created) {
        const attended = parseAlertDate(alert.attentionDate);
        if (attended && attended.getTime() >= created.getTime()) {
          totalAttentionSeconds += (attended.getTime() - created.getTime()) / 1000;
          attentionCount++;
        }
      }

      // Resolution time: culminationDate - attentionDate
      if (alert.culminationDate && alert.attentionDate) {
        const attended = parseAlertDate(alert.attentionDate);
        const culminated = parseAlertDate(alert.culminationDate);
        if (culminated && attended && culminated.getTime() >= attended.getTime()) {
          totalResolutionSeconds += (culminated.getTime() - attended.getTime()) / 1000;
          resolutionCount++;
        }
      }

      // Total time: culminationDate - creationDate
      if (alert.culminationDate && created) {
        const culminated = parseAlertDate(alert.culminationDate);
        if (culminated && culminated.getTime() >= created.getTime()) {
          totalElapsedSeconds += (culminated.getTime() - created.getTime()) / 1000;
          totalElapsedCount++;
        }
      }
    }

    const avgAttentionSecs =
      attentionCount > 0 ? Math.round(totalAttentionSeconds / attentionCount) : 0;
    const avgResolutionSecs =
      resolutionCount > 0 ? Math.round(totalResolutionSeconds / resolutionCount) : 0;
    const avgTotalSecs =
      totalElapsedCount > 0 ? Math.round(totalElapsedSeconds / totalElapsedCount) : 0;

    const averageTimes: AverageTimesMetricsDto = {
      attentionTimeSeconds: avgAttentionSecs,
      attentionTimeFormatted: formatDurationSeconds(avgAttentionSecs),
      resolutionTimeSeconds: avgResolutionSecs,
      resolutionTimeFormatted: formatDurationSeconds(avgResolutionSecs),
      totalTimeSeconds: avgTotalSecs,
      totalTimeFormatted: formatDurationSeconds(avgTotalSecs),
    };

    // 6. Build Recent Commentaries
    const recentCommentaries: RecentCommentaryDto[] = recentCommentsDocs.map((doc) => {
      const u = doc.id_user;
      const userName = u
        ? `${u.name ?? ''} ${u.lastname ?? ''}`.trim() || 'Ciudadano'
        : 'Ciudadano';

      return {
        id: doc._id.toString(),
        commentary: doc.commentary ?? '',
        score: doc.score ?? 0,
        userName,
        userImage: u?.image,
        date: doc.creationDate,
      };
    });

    return {
      states,
      users,
      averageTimes,
      typesDistribution,
      monthlySeries,
      recentCommentaries,
      year: targetYear,
    };
  }
}
