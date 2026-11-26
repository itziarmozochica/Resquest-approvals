import { TrackingEvent } from '../../tracking-event';
import { TrackingEvents } from '../tracking-events';

export interface InventoryChangeTabData {
  tab_id: string;
}

export class InventoryChangeTabEvent extends TrackingEvent<InventoryChangeTabData> {
  constructor(readonly data: InventoryChangeTabData) {
    super(TrackingEvents.InventoryChangeTab, data);
  }
}
