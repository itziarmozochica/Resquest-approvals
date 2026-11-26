import { ShowErrorModalEvent } from '../../core/events/show-error-modal';
import { MixpanelEvent } from '../../providers/mixpanel/mixpanel-event';
import { MixpanelTrackingMapper } from '../../providers/mixpanel/mixpanel-mapper';

export class ShowErrorModalMapper implements MixpanelTrackingMapper<ShowErrorModalEvent> {
  map(event: ShowErrorModalEvent): MixpanelEvent {
    return new MixpanelEvent('show_error_modal', event.data);
  }
}
