import { TrackingEvent } from '../../tracking-event';
import { TrackingEvents } from '../tracking-events';

export interface ClickUnvalidateCtaData {
  codes: string[];
  order_id: number;
  partner_id: number;
  partner_name: string;
  plan_id: number;
  ticket_id: number;
  user_id: number;
}

export class ClickUnvalidateCtaEvent extends TrackingEvent<ClickUnvalidateCtaData> {
  constructor(readonly data: ClickUnvalidateCtaData) {
    super(TrackingEvents.ClickUnvalidateCta, data);
  }
}
