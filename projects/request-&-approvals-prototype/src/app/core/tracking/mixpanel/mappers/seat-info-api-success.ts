import { SeatInfoApiSuccessEvent } from '../../core/events/seat-info-api-success';
import { MixpanelEvent } from '../../providers/mixpanel/mixpanel-event';
import { MixpanelTrackingMapper } from '../../providers/mixpanel/mixpanel-mapper';

export class SeatInfoApiSuccessMapper implements MixpanelTrackingMapper<SeatInfoApiSuccessEvent> {
  map(event: SeatInfoApiSuccessEvent): MixpanelEvent {
    return new MixpanelEvent('seat_info_api_success', event.data);
  }
}
