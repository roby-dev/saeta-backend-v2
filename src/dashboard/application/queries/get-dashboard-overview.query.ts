export class GetDashboardOverviewQuery {
  constructor(public readonly year: number = new Date().getFullYear()) {}
}
