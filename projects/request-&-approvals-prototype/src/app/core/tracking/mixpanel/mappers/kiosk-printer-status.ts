import { KioskPrinterStatusEvent } from '../../core/events/kiosk-printer-status';
import { MixpanelEvent } from '../../providers/mixpanel/mixpanel-event';
import { MixpanelTrackingMapper } from '../../providers/mixpanel/mixpanel-mapper';

export class KioskPrinterStatusMapper implements MixpanelTrackingMapper<KioskPrinterStatusEvent> {
  map(event: KioskPrinterStatusEvent): MixpanelEvent {
    return new MixpanelEvent('kiosk_printer_status', event.data);
  }
}
