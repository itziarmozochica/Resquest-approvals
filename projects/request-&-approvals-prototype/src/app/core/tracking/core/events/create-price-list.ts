import { TrackingEvent } from '../../tracking-event';
import { TrackingEvents } from '../tracking-events';

export interface CreatePriceListData {
  plan_id: number;
  price_list_name: string;
}

export class CreatePriceListEvent extends TrackingEvent<CreatePriceListData> {
  constructor(readonly data: CreatePriceListData) {
    super(TrackingEvents.CreatePriceList, data);
  }
}
