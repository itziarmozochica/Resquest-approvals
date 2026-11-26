import { TrackingEvent } from '../../tracking-event';
import { TrackingEvents } from '../tracking-events';

export interface InventoryPreviousStepData {
  from_tab: string;
  to_tab: string;
}

export class InventoryPreviousStepEvent extends TrackingEvent<InventoryPreviousStepData> {
  constructor(readonly data: InventoryPreviousStepData) {
    super(TrackingEvents.InventoryPreviousStep, data);
  }
}
