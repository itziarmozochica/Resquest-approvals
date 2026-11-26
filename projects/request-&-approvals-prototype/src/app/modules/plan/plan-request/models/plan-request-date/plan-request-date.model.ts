export interface PlanRequestDateData {
  starts_at: string;
  ends_at: string;
  id: string;
  plan_request_id: string;
}

export class PlanRequestDate {
  constructor(
    public startsAt: string,
    public endsAt: string,
    public id?: string,
    public planRequestId?: string,
  ) {}
}
