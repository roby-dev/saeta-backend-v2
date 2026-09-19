export interface AlertUserSummary {
  id: string;
  name: string;
  lastname?: string;
  dni?: string;
  phone?: string;
  email?: string;
  image?: string;
  role?: string;
  availability?: string;
  statusAccount?: string;
  averageScore?: number;
  alertsAttended?: number;
}

export interface AlertTypeSummary {
  id: string;
  name: string;
  priority?: number;
}

export interface AlertStateSummary {
  id: string;
  name: string;
}

export interface AlertEntity {
  id: string;
  userId: string;
  latitude: number;
  longitude: number;
  typeId: string;
  stateId: string;
  creationDate: string;
  attentionDate?: string;
  culminationDate?: string;
  attendedById?: string;
  commentary?: string;
  score?: number;
  createdAt?: Date;
  updatedAt?: Date;

  // Populated relations when available
  user?: AlertUserSummary;
  attendedBy?: AlertUserSummary;
  type?: AlertTypeSummary;
  state?: AlertStateSummary;
}
