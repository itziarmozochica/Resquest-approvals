import { SearchShiftsEvent } from '../../core/events/search-shifts';
import { MixpanelEvent } from '../../providers/mixpanel/mixpanel-event';
import { MixpanelTrackingMapper } from '../../providers/mixpanel/mixpanel-mapper';

export class SearchShiftsMapper implements MixpanelTrackingMapper<SearchShiftsEvent> {
  map(event: SearchShiftsEvent): MixpanelEvent {
    return new MixpanelEvent('search_shifts', event.data);
  }
}
