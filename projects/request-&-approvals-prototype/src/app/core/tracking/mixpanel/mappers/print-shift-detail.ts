import { PrintShiftDetailEvent } from '../../core/events/print-shift-detail';
import { MixpanelEvent } from '../../providers/mixpanel/mixpanel-event';
import { MixpanelTrackingMapper } from '../../providers/mixpanel/mixpanel-mapper';

export class PrintShiftDetailMapper implements MixpanelTrackingMapper<PrintShiftDetailEvent> {
  map(event: PrintShiftDetailEvent): MixpanelEvent {
    return new MixpanelEvent('print_shift_detail', event.data);
  }
}
