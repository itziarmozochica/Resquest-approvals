import { PriceList } from '../../../../modules/sessions/shared/models/price-list.model';
import { TrackingEvent } from '../../tracking-event';
import { TrackingEvents } from '../tracking-events';

export interface ClickSavePriceListsPrioritiesData {
  plan_id: number;
  previous_ordering: Record<PriceList['id'], number>;
  new_ordering: Record<PriceList['id'], number>;
}

export class ClickSavePriceListsPrioritiesEvent extends TrackingEvent<ClickSavePriceListsPrioritiesData> {
  constructor(readonly data: ClickSavePriceListsPrioritiesData) {
    super(TrackingEvents.ClickSavePriceListsPriorities, data);
  }
}
