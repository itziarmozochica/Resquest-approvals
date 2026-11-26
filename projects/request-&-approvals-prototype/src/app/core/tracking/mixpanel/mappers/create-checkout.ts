import { PaymentCheckout } from '@fz-original/app/app/enums/payment.enum';

import { CreateCheckoutEvent } from '../../core/events/create-checkout';
import { MixpanelEvent } from '../../providers/mixpanel/mixpanel-event';
import { MixpanelTrackingMapper } from '../../providers/mixpanel/mixpanel-mapper';
import { TrackingEvent } from '../../tracking-event';

export class CreateCheckoutMapper implements MixpanelTrackingMapper<CreateCheckoutEvent> {
  map(event: TrackingEvent<any>): MixpanelEvent {
    const isLocal = event.data.payment_gateway === PaymentCheckout[PaymentCheckout.adyen_local];
    return new MixpanelEvent('create_checkout', isLocal ? { ...event.data, payment_integration_mode: 'local' } : event.data);
  }
}
