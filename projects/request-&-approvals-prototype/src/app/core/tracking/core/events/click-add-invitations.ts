import { TrackingEvent } from '../../tracking-event';
import { TrackingEvents } from '../tracking-events';

export interface ClickAddInvitationsData {
  city_id: number;
  city_name: string;
  plan_id: number;
  plan_name: string;
  place_id: number;
  place_name: string;
  time: string;
  timezone: string;
  ticket_count: number;
  session_details: {
    session_id: number;
    session_name: string;
    sellable: boolean;
    start_date: string;
    end_date: string;
    purchasable_from_date: string;
    purchasable_until_date: string;
  };
}

export class ClickAddInvitationsEvent extends TrackingEvent<ClickAddInvitationsData> {
  constructor(readonly data: ClickAddInvitationsData) {
    super(TrackingEvents.ClickAddInvitations, data);
  }
}
