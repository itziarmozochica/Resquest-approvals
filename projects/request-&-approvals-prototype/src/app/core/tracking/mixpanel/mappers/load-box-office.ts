import { LoadBoxOfficeEvent } from '../../core/events/load-box-office';
import { MixpanelEvent } from '../../providers/mixpanel/mixpanel-event';
import { MixpanelTrackingMapper } from '../../providers/mixpanel/mixpanel-mapper';

export class LoadBoxOfficeMapper implements MixpanelTrackingMapper<LoadBoxOfficeEvent> {
  map(event: LoadBoxOfficeEvent): MixpanelEvent {
    return new MixpanelEvent('load_box_office', event.data);
  }
}
