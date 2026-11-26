import { SendBookingAnswersEvent } from '@fz-original/app/core/tracking/core/events/send-booking-answers';

import { MixpanelEvent } from '../../providers/mixpanel/mixpanel-event';
import { MixpanelTrackingMapper } from '../../providers/mixpanel/mixpanel-mapper';

export class SendBookingAnswersMapper implements MixpanelTrackingMapper<SendBookingAnswersEvent> {
  map(event: SendBookingAnswersEvent): MixpanelEvent {
    return new MixpanelEvent('send_booking_answers', event.data);
  }
}
