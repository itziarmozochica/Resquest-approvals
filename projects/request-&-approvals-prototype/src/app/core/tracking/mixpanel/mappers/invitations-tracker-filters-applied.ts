import { InvitationsTrackerFiltersAppliedEvent } from '../../core/events/invitations-tracker-filters-applied';
import { MixpanelEvent } from '../../providers/mixpanel/mixpanel-event';
import { MixpanelTrackingMapper } from '../../providers/mixpanel/mixpanel-mapper';

export class InvitationsTrackerFiltersAppliedMapper implements MixpanelTrackingMapper<InvitationsTrackerFiltersAppliedEvent> {
  map(event: InvitationsTrackerFiltersAppliedEvent): MixpanelEvent {
    return new MixpanelEvent('invitations_tracker_filters_applied', event.data);
  }
}
