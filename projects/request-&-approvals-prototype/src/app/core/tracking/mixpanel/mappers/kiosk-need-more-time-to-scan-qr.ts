import { KioskNeedMoreTimeToScanQREvent } from '../../core/events/kiosk-need-more-time-to-scan-qr';
import { MixpanelEvent } from '../../providers/mixpanel/mixpanel-event';
import { MixpanelTrackingMapper } from '../../providers/mixpanel/mixpanel-mapper';

export class KioskNeedMoreTimeToScanQrMapper implements MixpanelTrackingMapper<KioskNeedMoreTimeToScanQREvent> {
  map(event: KioskNeedMoreTimeToScanQREvent): MixpanelEvent {
    return new MixpanelEvent('kiosk_need_more_time_to_scan_qr', event.data);
  }
}
