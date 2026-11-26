import { RestoreGroupPriceOverridesEvent } from '../../core/events/restore-group-price-overrides';
import { MixpanelEvent } from '../../providers/mixpanel/mixpanel-event';
import { MixpanelTrackingMapper } from '../../providers/mixpanel/mixpanel-mapper';

export class RestoreGroupPriceOverridesMapper implements MixpanelTrackingMapper<RestoreGroupPriceOverridesEvent> {
  map(event: RestoreGroupPriceOverridesEvent): MixpanelEvent {
    return new MixpanelEvent('restore_group_price_overrides', event.data);
  }
}
