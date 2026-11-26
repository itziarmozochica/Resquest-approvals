import { ClickKioskBookingQuestionsEvent } from '../../core/events/click-kiosk-booking-questions';
import { MixpanelEvent } from '../../providers/mixpanel/mixpanel-event';
import { MixpanelTrackingMapper } from '../../providers/mixpanel/mixpanel-mapper';

export class ClickKioskBookingQuestionsMapper implements MixpanelTrackingMapper<ClickKioskBookingQuestionsEvent> {
  map(event: ClickKioskBookingQuestionsEvent): MixpanelEvent {
    return new MixpanelEvent('click_kiosk_booking_questions', event.data);
  }
}
