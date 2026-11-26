import { ApplyCouponOneStepEvent } from '../../core/events/apply-coupon-one-step';
import { MixpanelEvent } from '../../providers/mixpanel/mixpanel-event';
import { MixpanelTrackingMapper } from '../../providers/mixpanel/mixpanel-mapper';

export class ApplyCouponOneStepMapper implements MixpanelTrackingMapper<ApplyCouponOneStepEvent> {
  map(event: ApplyCouponOneStepEvent): MixpanelEvent {
    return new MixpanelEvent('apply_coupon_one_step', event.data);
  }
}
