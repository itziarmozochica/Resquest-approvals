import { TrackingEvent } from '../../tracking-event';
import { TrackingEvents } from '../tracking-events';

export interface ExpandOrderHistoryCancellationRecordData {
  order_id: number;
  cancellation_record_reason: string;
  cancellation_record_index: number;
}

export class ExpandOrderHistoryCancellationRecordEvent extends TrackingEvent<ExpandOrderHistoryCancellationRecordData> {
  constructor(readonly data: ExpandOrderHistoryCancellationRecordData) {
    super(TrackingEvents.ExpandOrderHistoryCancellationRecord, data);
  }
}
