import { SeatInfoApiErrorEvent } from '../../core/events/seat-info-api-error';
import { MixpanelEvent } from '../../providers/mixpanel/mixpanel-event';
import { MixpanelTrackingMapper } from '../../providers/mixpanel/mixpanel-mapper';

export class SeatInfoApiErrorMapper implements MixpanelTrackingMapper<SeatInfoApiErrorEvent> {
  map(event: SeatInfoApiErrorEvent): MixpanelEvent {
    return new MixpanelEvent('seat_info_api_error', event.data);
  }
}
