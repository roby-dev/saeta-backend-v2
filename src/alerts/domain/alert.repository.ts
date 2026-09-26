import type { StateCode } from '../../states/domain/state-code.enum.js';
import type { AlertEntity } from './alert.entity.js';

export const ALERT_REPOSITORY = Symbol('ALERT_REPOSITORY');

export interface CreateAlertData {
  userId: string;
  latitude: number;
  longitude: number;
  typeId: string;
  stateId: string;
  creationDate: string;
}

export interface UpdateAlertData {
  stateId?: string;
  attendedById?: string;
  attentionDate?: string;
  culminationDate?: string;
  commentary?: string;
  score?: number;
}

export interface FindAlertsFilter {
  stateId?: string;
  typeId?: string;
  skip?: number;
  limit?: number;
}

export interface AlertStateCounts {
  pending: number;
  inProcess: number;
  resolved: number;
  rejected: number;
  total: number;
}

export interface PaginatedAlerts {
  alerts: AlertEntity[];
  total: number;
  stateCounts?: AlertStateCounts;
}

export interface AlertRepository {
  findById(id: string): Promise<AlertEntity | null>;
  findMany(filter: FindAlertsFilter): Promise<PaginatedAlerts>;
  findByUser(userId: string): Promise<{ alerts: AlertEntity[]; total: number }>;
  findByAttendedUser(attendedById: string): Promise<{ alerts: AlertEntity[]; total: number }>;
  findPendingByUser(userId: string): Promise<AlertEntity | null>;
  create(data: CreateAlertData): Promise<AlertEntity>;
  update(id: string, data: UpdateAlertData): Promise<AlertEntity | null>;
  deletePending(): Promise<number>;
  getDefaultPendingStateId(): Promise<string | null>;
  getStateCode(stateId: string): Promise<StateCode | null>;
  findStateIdByCode(code: StateCode): Promise<string | null>;
}


