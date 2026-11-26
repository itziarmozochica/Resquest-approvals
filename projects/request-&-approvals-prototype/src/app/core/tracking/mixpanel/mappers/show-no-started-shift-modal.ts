import { CloseNoShiftStartedModalEvent, ShowNoShiftStartedModalEvent } from '../../core/events/no-shift-started-modal';
import { MixpanelEvent } from '../../providers/mixpanel/mixpanel-event';
import { MixpanelTrackingMapper } from '../../providers/mixpanel/mixpanel-mapper';

export class ShowNoShiftStartedModalMapper implements MixpanelTrackingMapper<ShowNoShiftStartedModalEvent> {
  map(event: ShowNoShiftStartedModalEvent): MixpanelEvent {
    return new MixpanelEvent('show_no_shift_started_modal', event.data);
  }
}

export class CloseNoShiftStartedModalMapper implements MixpanelTrackingMapper<CloseNoShiftStartedModalEvent> {
  map(event: CloseNoShiftStartedModalEvent): MixpanelEvent {
    return new MixpanelEvent('close_no_shift_started_modal', event.data);
  }
}
