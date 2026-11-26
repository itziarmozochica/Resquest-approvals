import { TrackingEvent } from '../../tracking-event';
import { TrackingEvents } from '../tracking-events';

export interface AutoPrintStatusData {
  auto_print: boolean;
  source: string;
  order_id: number;
  previous_url: string;
  plan_name: string;
  plan_id: number;
}

export class AutoPrintStatusEvent extends TrackingEvent<AutoPrintStatusData> {
  constructor(readonly data: AutoPrintStatusData) {
    super(TrackingEvents.AutoPrintStatus, data);
  }
}
