import { TrackingEvents } from '@fz-original/app/core/tracking/core/tracking-events';
import { TrackingEvent } from '@fz-original/app/core/tracking/tracking-event';

export interface RoundingHelpClickData {
  time: string;
  scope: string;
  rounding_quantity?: number;
}

export class RoundingHelpClickEvent extends TrackingEvent<RoundingHelpClickData> {
  constructor(readonly data: RoundingHelpClickData) {
    super(TrackingEvents.RoundingHelpClick, data);
  }
}
