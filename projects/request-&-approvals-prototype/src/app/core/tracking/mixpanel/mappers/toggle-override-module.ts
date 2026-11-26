import { ToggleOverrideModuleEvent } from '@fz-original/app/core/tracking/core/events/toggle-override-module';
import { MixpanelEvent } from '@fz-original/app/core/tracking/providers/mixpanel/mixpanel-event';
import { MixpanelTrackingMapper } from '@fz-original/app/core/tracking/providers/mixpanel/mixpanel-mapper';

export class ToggleOverrideModuleMapper implements MixpanelTrackingMapper<ToggleOverrideModuleEvent> {
  map(event: ToggleOverrideModuleEvent): MixpanelEvent {
    return new MixpanelEvent('FZ|Reservation|Override|Toggle', event.data);
  }
}
