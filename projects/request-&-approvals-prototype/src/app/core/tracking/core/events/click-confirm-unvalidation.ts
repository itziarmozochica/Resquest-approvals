import { TrackingEvent } from '../../tracking-event';
import { TrackingEvents } from '../tracking-events';

export interface ClickConfirmUnvalidationData {
  codes: string[];
  order_id: number;
  partner_id: number;
  partner_name: string;
  plan_id: number;
  ticket_id: number;
  user_id: number;
}

export class ClickConfirmUnvalidationEvent extends TrackingEvent<ClickConfirmUnvalidationData> {
  constructor(readonly data: ClickConfirmUnvalidationData) {
    super(TrackingEvents.ClickConfirmUnvalidation, data);
  }
}
