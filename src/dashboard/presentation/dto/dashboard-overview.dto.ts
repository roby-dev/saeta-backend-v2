export interface StateMetricsDto {
  pending: number;
  inProcess: number;
  resolved: number;
  rejected: number;
  total: number;
}

export interface UserRoleMetricsDto {
  admin: number;
  baseSecurity: number;
  securityPersonnel: number;
  citizen: number;
  total: number;
}

export interface AverageTimesMetricsDto {
  attentionTimeSeconds: number;
  attentionTimeFormatted: string;
  resolutionTimeSeconds: number;
  resolutionTimeFormatted: string;
  totalTimeSeconds: number;
  totalTimeFormatted: string;
}

export interface TypeDistributionDto {
  id: string;
  name: string;
  count: number;
  percentage: number;
}

export interface RecentCommentaryDto {
  id: string;
  commentary: string;
  score: number;
  userName: string;
  userImage?: string;
  date: string;
}

export interface DashboardOverviewDto {
  states: StateMetricsDto;
  users: UserRoleMetricsDto;
  averageTimes: AverageTimesMetricsDto;
  typesDistribution: TypeDistributionDto[];
  monthlySeries: number[];
  recentCommentaries: RecentCommentaryDto[];
  year: number;
  weeklyAlerts: number;
}

