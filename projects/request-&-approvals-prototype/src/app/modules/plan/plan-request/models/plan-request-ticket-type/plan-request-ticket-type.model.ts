export interface PlanRequestTicketTypeData {
  id: string;
  plan_request_id: string;
  type: string;
  price: string;
  available_tickets: string;
  weekdays_applies: string;
  sessions_hours: string;
}

export class PlanRequestTicketType {
  constructor(
    public type?: string,
    public price?: string,
    public availableTickets?: string,
    public weekdaysApplies?: string,
    public sessionsHours?: string,
    public id?: string,
    public planRequestId?: string,
  ) {}

  checkMandatoryFields(): boolean {
    if (this.type == undefined || this.type == '') {
      return false;
    }
    if (this.price == undefined || this.price == '') {
      return false;
    }
    if (this.availableTickets == undefined || this.availableTickets == '') {
      return false;
    }
    if (this.weekdaysApplies == undefined || this.weekdaysApplies == '') {
      return false;
    }
    if (this.sessionsHours == undefined || this.sessionsHours == '') {
      return false;
    }
    return true;
  }
}
