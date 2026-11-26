import { OpenMarketingCatalogEvent } from '../../core/events/open-marketing-catalog';
import { MixpanelEvent } from '../../providers/mixpanel/mixpanel-event';
import { MixpanelTrackingMapper } from '../../providers/mixpanel/mixpanel-mapper';
import { TrackingEvent } from '../../tracking-event';

export class OpenMarketingCatalogMapper implements MixpanelTrackingMapper<OpenMarketingCatalogEvent> {
  map(event: TrackingEvent<any>): MixpanelEvent {
    return new MixpanelEvent('open_marketing_catalog', event.data);
  }
}
