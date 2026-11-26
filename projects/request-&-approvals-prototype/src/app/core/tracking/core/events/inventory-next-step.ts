import { TrackingEvent } from '../../tracking-event';
import { TrackingEvents } from '../tracking-events';

export interface InventoryNextStepData {
  from_tab: string;
  to_tab: string;
}

export class InventoryNextStepEvent extends TrackingEvent<InventoryNextStepData> {
  constructor(readonly data: InventoryNextStepData) {
    super(TrackingEvents.InventoryNextStep, data);
  }
}
