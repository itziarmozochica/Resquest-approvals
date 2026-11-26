import { PrintValidateEvent } from '../../core/events/print-validate';
import { MixpanelEvent } from '../../providers/mixpanel/mixpanel-event';
import { MixpanelTrackingMapper } from '../../providers/mixpanel/mixpanel-mapper';

export class PrintValidateMapper implements MixpanelTrackingMapper<PrintValidateEvent> {
  map(event: PrintValidateEvent): MixpanelEvent {
    return new MixpanelEvent('print_validate', event.data);
  }
}
