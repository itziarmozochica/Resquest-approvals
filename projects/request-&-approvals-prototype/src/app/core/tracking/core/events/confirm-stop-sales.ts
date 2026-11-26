import { TrackingEvent } from '../../tracking-event';
import { TrackingEvents } from '../tracking-events';

export interface ConfirmStopSalesData {
  plan_id: number;
  plan_name: string;
  session_id: number;
  session_name: string;
  session_date: string;
}

export class ConfirmStopSalesEvent extends TrackingEvent<ConfirmStopSalesData> {
  constructor(readonly data: ConfirmStopSalesData) {
    super(TrackingEvents.ConfirmStopSales, data);
  }
}
