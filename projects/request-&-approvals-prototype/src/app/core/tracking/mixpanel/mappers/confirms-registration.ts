import { ConfirmsRegistrationEvent } from '../../core/events/confirms-registration';
import { MixpanelEvent } from '../../providers/mixpanel/mixpanel-event';
import { MixpanelTrackingMapper } from '../../providers/mixpanel/mixpanel-mapper';

export class ConfirmsRegistrationMapper implements MixpanelTrackingMapper<ConfirmsRegistrationEvent> {
  map(event: ConfirmsRegistrationEvent): MixpanelEvent {
    return new MixpanelEvent('confirms_registration', event.data);
  }
}
