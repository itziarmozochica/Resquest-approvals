import { PriceListOverviewView } from '@fz-original/app/modules/inventory/inventory-pricing/shared/models/price-list-overview-views.model';

import { TrackingEvent } from '../../tracking-event';
import { TrackingEvents } from '../tracking-events';

export interface SelectPriceListViewData {
  selected_view: PriceListOverviewView;
}
export class SelectPriceListViewEvent extends TrackingEvent<SelectPriceListViewData> {
  constructor(readonly data: SelectPriceListViewData) {
    super(TrackingEvents.SelectPriceListView, data);
  }
}
