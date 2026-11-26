import { ClickApplyCouponEvent } from '../../core/events/click-apply-coupon';
import { MixpanelEvent } from '../../providers/mixpanel/mixpanel-event';
import { MixpanelTrackingMapper } from '../../providers/mixpanel/mixpanel-mapper';

export class ClickApplyCouponMapper implements MixpanelTrackingMapper<ClickApplyCouponEvent> {
  map(event: ClickApplyCouponEvent): MixpanelEvent {
    return new MixpanelEvent('click_apply_coupon', event.data);
  }
}
