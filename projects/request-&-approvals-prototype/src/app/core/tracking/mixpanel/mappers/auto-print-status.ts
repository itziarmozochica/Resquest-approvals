import { AutoPrintStatusEvent } from '../../core/events/auto-print-status';
import { MixpanelEvent } from '../../providers/mixpanel/mixpanel-event';
import { MixpanelTrackingMapper } from '../../providers/mixpanel/mixpanel-mapper';
import { TrackingEvent } from '../../tracking-event';

export class AutoPrintStatusMapper implements MixpanelTrackingMapper<AutoPrintStatusEvent> {
  map(event: TrackingEvent<any>): MixpanelEvent {
    return new MixpanelEvent('auto_print_status', event.data);
  }
}
