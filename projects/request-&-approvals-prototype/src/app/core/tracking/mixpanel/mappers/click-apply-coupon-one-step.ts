import { ClickApplyCouponOneStepEvent } from '../../core/events/click-apply-coupon-one-step';
import { MixpanelEvent } from '../../providers/mixpanel/mixpanel-event';
import { MixpanelTrackingMapper } from '../../providers/mixpanel/mixpanel-mapper';

export class ClickApplyCouponOneStepMapper implements MixpanelTrackingMapper<ClickApplyCouponOneStepEvent> {
  map(event: ClickApplyCouponOneStepEvent): MixpanelEvent {
    return new MixpanelEvent('click_apply_coupon_one_step', event.data);
  }
}
