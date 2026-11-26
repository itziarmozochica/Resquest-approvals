import { CreateTemplateCouponEvent } from '../../core/events/create-template-coupon';
import { MixpanelEvent } from '../../providers/mixpanel/mixpanel-event';
import { MixpanelTrackingMapper } from '../../providers/mixpanel/mixpanel-mapper';

export class CreateTemplateCouponMapper implements MixpanelTrackingMapper<CreateTemplateCouponEvent> {
  map(event: CreateTemplateCouponEvent): MixpanelEvent {
    return new MixpanelEvent('create_promocode', event.data);
  }
}
