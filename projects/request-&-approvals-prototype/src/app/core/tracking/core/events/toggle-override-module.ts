import { TrackingEvents } from '@fz-original/app/core/tracking/core/tracking-events';
import { TrackingEvent } from '@fz-original/app/core/tracking/tracking-event';

export interface ToggleOverrideModuleData {
  time: string;
  scope: string;
  new_state: boolean;
}

export class ToggleOverrideModuleEvent extends TrackingEvent<ToggleOverrideModuleData> {
  constructor(readonly data: ToggleOverrideModuleData) {
    super(TrackingEvents.ToggleOverrideModule, data);
  }
}
