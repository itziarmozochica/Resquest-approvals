import { TrackingEvent } from '../../tracking-event';
import { TrackingEvents } from '../tracking-events';

export interface ConfirmBulkEditSessionsPerTimeslotData {
  plan_id: number;
  plan_name: string;
}

export class ConfirmBulkEditSessionsPerTimeslotEvent extends TrackingEvent<ConfirmBulkEditSessionsPerTimeslotData> {
  constructor(readonly data: ConfirmBulkEditSessionsPerTimeslotData) {
    super(TrackingEvents.ConfirmBulkEditSessionsPerTimeslot, data);
  }
}
