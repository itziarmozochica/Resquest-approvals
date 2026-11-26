export interface SessionModel {
  id: number;
  price: string;
  startDate: Date;
  endDate: Date;
  name: string;
  isExpired: boolean;
  isSoldOut: boolean;
  availableTickets: number;
}

export interface SessionsSliceModel {
  totalSessions: number;
  nextPage?: string;
  sessions: SessionModel[];
}
