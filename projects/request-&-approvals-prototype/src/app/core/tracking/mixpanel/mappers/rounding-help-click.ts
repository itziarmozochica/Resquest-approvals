import { RoundingHelpClickEvent } from '@fz-original/app/core/tracking/core/events/rounding-help-click-module';
import { MixpanelEvent } from '@fz-original/app/core/tracking/providers/mixpanel/mixpanel-event';
import { MixpanelTrackingMapper } from '@fz-original/app/core/tracking/providers/mixpanel/mixpanel-mapper';

export class RoundingHelpClickMapper implements MixpanelTrackingMapper<RoundingHelpClickEvent> {
  map(event: RoundingHelpClickEvent): MixpanelEvent {
    return new MixpanelEvent('FZ|Reservation|Override|RoundingHelp|Click', event.data);
  }
}
