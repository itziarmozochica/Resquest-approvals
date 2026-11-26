import { ClickSearchOrdersData } from '@fz-original/app/core/tracking/core/events/click-search-orders';

import { TrackingEvent } from '../../tracking-event';
import { TrackingEvents } from '../tracking-events';

export interface SearchOrdersData extends ClickSearchOrdersData {
  has_results: boolean;
}

export class SearchOrdersEvent extends TrackingEvent<SearchOrdersData> {
  constructor(readonly data: SearchOrdersData) {
    super(TrackingEvents.SearchOrders, data);
  }
}
