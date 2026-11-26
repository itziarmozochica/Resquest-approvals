import { DownloadReservationsEvent } from '../../core/events/download-reservations';
import { MixpanelEvent } from '../../providers/mixpanel/mixpanel-event';
import { MixpanelTrackingMapper } from '../../providers/mixpanel/mixpanel-mapper';

export class DownloadReservationsMapper implements MixpanelTrackingMapper<DownloadReservationsEvent> {
  map(event: DownloadReservationsEvent): MixpanelEvent {
    return new MixpanelEvent('download_reservations', event.data);
  }
}
