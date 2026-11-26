import { SearchUsersEvent } from '../../core/events/search-users';
import { MixpanelEvent } from '../../providers/mixpanel/mixpanel-event';
import { MixpanelTrackingMapper } from '../../providers/mixpanel/mixpanel-mapper';

export class SearchUsersMapper implements MixpanelTrackingMapper<SearchUsersEvent> {
  map(event: SearchUsersEvent): MixpanelEvent {
    return new MixpanelEvent('search_users', event.data);
  }
}
