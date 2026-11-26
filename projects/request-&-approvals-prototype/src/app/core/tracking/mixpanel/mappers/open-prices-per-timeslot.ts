import { OpenPricesPerTimeslotEvent } from '../../core/events/open-prices-per-timeslot';
import { MixpanelEvent } from '../../providers/mixpanel/mixpanel-event';
import { MixpanelTrackingMapper } from '../../providers/mixpanel/mixpanel-mapper';

export class OpenPricesPerTimeslotMapper implements MixpanelTrackingMapper<OpenPricesPerTimeslotEvent> {
  map(event: OpenPricesPerTimeslotEvent): MixpanelEvent {
    return new MixpanelEvent('open_prices_per_timeslot', event.data);
  }
}
