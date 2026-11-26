import { ClickConfirmUnvalidationEvent } from '../../core/events/click-confirm-unvalidation';
import { MixpanelEvent } from '../../providers/mixpanel/mixpanel-event';
import { MixpanelTrackingMapper } from '../../providers/mixpanel/mixpanel-mapper';

export class ClickConfirmUnvalidationMapper implements MixpanelTrackingMapper<ClickConfirmUnvalidationEvent> {
  map(event: ClickConfirmUnvalidationEvent): MixpanelEvent {
    return new MixpanelEvent('click_confirm_unvalidation', event.data);
  }
}
