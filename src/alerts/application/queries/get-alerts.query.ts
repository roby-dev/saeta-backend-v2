import type { AlertEntity } from '../../domain/alert.entity.js';

export interface GetAlertsResult {
  alerts: AlertEntity[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export class GetAlertsQuery {
  constructor(
    public readonly page: number = 1,
    public readonly limit: number = 20,
    public readonly stateId?: string,
    public readonly typeId?: string,
  ) {}
}
