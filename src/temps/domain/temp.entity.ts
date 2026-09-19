export interface TempUserSummary {
  id: string;
  name: string;
  lastname: string;
  dni?: string;
  image?: string;
  role?: string;
}

export class TempEntity {
  id!: string;
  userId!: string;
  tempPassword!: string;
  date!: string;
  user?: TempUserSummary;
}
