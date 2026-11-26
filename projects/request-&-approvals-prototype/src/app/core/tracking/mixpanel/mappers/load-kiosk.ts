import { LoadKioskEvent } from '../../core/events/load-kiosk';
import { MixpanelEvent } from '../../providers/mixpanel/mixpanel-event';
import { MixpanelTrackingMapper } from '../../providers/mixpanel/mixpanel-mapper';

export class LoadKioskMapper implements MixpanelTrackingMapper<LoadKioskEvent> {
  map(event: LoadKioskEvent): MixpanelEvent {
    return new MixpanelEvent('load_kiosk', event.data);
  }
}
