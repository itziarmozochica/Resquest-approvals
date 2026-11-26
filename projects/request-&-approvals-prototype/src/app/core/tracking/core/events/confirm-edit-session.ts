import { TrackingEvent } from '../../tracking-event';
import { TrackingEvents } from '../tracking-events';

export interface ConfirmEditSessionData {
  plan_id: number;
  session_id: number;
  session_name: string;
  session_date: string;
  available_tickets: number;

  previous_name?: string;
  new_name?: string;

  previous_capacity?: number;
  new_capacity?: number;

  previous_price?: number;
  new_price?: number;
  currency?: string;

  previous_sold_out?: boolean;
  new_sold_out?: boolean;

  previous_hidden?: boolean;
  new_hidden?: boolean;

  previous_since?: string;
  new_since?: string;

  previous_until?: string;
  new_until?: string;
}

export class ConfirmEditSessionEvent extends TrackingEvent<ConfirmEditSessionData> {
  constructor(readonly data: ConfirmEditSessionData) {
    super(TrackingEvents.ConfirmEditSession, data);
  }
}
