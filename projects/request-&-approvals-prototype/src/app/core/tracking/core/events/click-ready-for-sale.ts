import { TrackingEvent } from '../../tracking-event';
import { TrackingEvents } from '../tracking-events';

export interface ClickReadyForSaleData {
  plan_id: number;
}

export class ClickReadyForSaleEvent extends TrackingEvent<ClickReadyForSaleData> {
  constructor(readonly data: ClickReadyForSaleData) {
    super(TrackingEvents.ClickReadyForSale, data);
  }
}
