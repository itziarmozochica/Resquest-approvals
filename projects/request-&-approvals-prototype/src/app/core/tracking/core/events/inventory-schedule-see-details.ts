import { TrackingEvent } from '../../tracking-event';
import { TrackingEvents } from '../tracking-events';

export type InventoryScheduleSeeDetailsSource = 'see_all_dates' | 'see_all_exceptions' | 'details_button' | 'row';

export interface InventoryScheduleSeeDetailsData {
  source: InventoryScheduleSeeDetailsSource;
}

export class InventoryScheduleSeeDetailsEvent extends TrackingEvent<InventoryScheduleSeeDetailsData> {
  constructor(readonly data: InventoryScheduleSeeDetailsData) {
    super(TrackingEvents.InventoryScheduleSeeDetails, data);
  }
}
