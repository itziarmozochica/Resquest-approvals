import { TrackingEvent } from '../../tracking-event';
import { TrackingEvents } from '../tracking-events';

export interface RestoreGroupPriceOverridesEventData {
  plan_id: number;
  timeslot_id: number;
  group_id: number;
}

export class RestoreGroupPriceOverridesEvent extends TrackingEvent<RestoreGroupPriceOverridesEventData> {
  constructor(readonly data: RestoreGroupPriceOverridesEventData) {
    super(TrackingEvents.RestoreGroupPriceOverrides, data);
  }
}
