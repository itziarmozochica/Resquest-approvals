import { TrackingEvent } from '../../tracking-event';
import { TrackingEvents } from '../tracking-events';

export interface RestoreSinglePriceOverrideEventData {
  plan_id: number;
  session_id: number;
  channel_id: string;
}

export class RestoreSinglePriceOverrideEvent extends TrackingEvent<RestoreSinglePriceOverrideEventData> {
  constructor(readonly data: RestoreSinglePriceOverrideEventData) {
    super(TrackingEvents.RestoreSinglePriceOverride, data);
  }
}
