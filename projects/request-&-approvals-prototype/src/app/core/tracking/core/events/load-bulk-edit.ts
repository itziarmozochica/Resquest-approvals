import { TrackingEvent } from '../../tracking-event';
import { TrackingEvents } from '../tracking-events';

interface LoadBulkEditData {
  partner_id: number;
  city_id: number;
  plan_id: number;
  place_id: number;
}

export class LoadBulkEditEvent extends TrackingEvent<LoadBulkEditData> {
  constructor(readonly data: LoadBulkEditData) {
    super(TrackingEvents.LoadBulkEdit, data);
  }
}
