import { ClickReservationAttendanceArrivedEvent } from '../../core/events/click-reservation-attendance-arrived';
import { MixpanelEvent } from '../../providers/mixpanel/mixpanel-event';
import { MixpanelTrackingMapper } from '../../providers/mixpanel/mixpanel-mapper';
import { TrackingEvent } from '../../tracking-event';

export class ClickReservationAttendanceArrivedMapper implements MixpanelTrackingMapper<ClickReservationAttendanceArrivedEvent> {
  map(event: TrackingEvent<any>): MixpanelEvent {
    return new MixpanelEvent('click_reservation_attendance_arrived', event.data);
  }
}
