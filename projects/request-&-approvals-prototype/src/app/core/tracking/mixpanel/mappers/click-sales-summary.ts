import { ClickSalesSummaryEvent } from '../../core/events/click-sales-summary';
import { MixpanelEvent } from '../../providers/mixpanel/mixpanel-event';
import { MixpanelTrackingMapper } from '../../providers/mixpanel/mixpanel-mapper';
import { TrackingEvent } from '../../tracking-event';

export class ClickSalesSummaryMapper implements MixpanelTrackingMapper<ClickSalesSummaryEvent> {
  map(event: TrackingEvent<any>): MixpanelEvent {
    return new MixpanelEvent('click_sales_summary', event.data);
  }
}
