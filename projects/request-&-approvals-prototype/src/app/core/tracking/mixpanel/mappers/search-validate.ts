import { SearchValidateEvent } from '../../core/events/search-validate';
import { MixpanelEvent } from '../../providers/mixpanel/mixpanel-event';
import { MixpanelTrackingMapper } from '../../providers/mixpanel/mixpanel-mapper';

export class SearchValidateMapper implements MixpanelTrackingMapper<SearchValidateEvent> {
  map(event: SearchValidateEvent): MixpanelEvent {
    return new MixpanelEvent('search_validate', event.data);
  }
}
