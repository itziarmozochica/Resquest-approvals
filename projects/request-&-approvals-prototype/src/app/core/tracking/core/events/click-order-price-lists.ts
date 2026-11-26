import { TrackingEvent } from '../../tracking-event';
import { TrackingEvents } from '../tracking-events';

export interface ClickOrderPriceListsData {
  plan_id: number;
}

export class ClickOrderPriceListsEvent extends TrackingEvent<ClickOrderPriceListsData> {
  constructor(readonly data: ClickOrderPriceListsData) {
    super(TrackingEvents.ClickOrderPriceLists, data);
  }
}
