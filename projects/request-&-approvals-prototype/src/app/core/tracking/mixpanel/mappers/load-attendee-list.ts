import { LoadAttendeeListEvent } from '../../core/events/load-attendee-list';
import { MixpanelEvent } from '../../providers/mixpanel/mixpanel-event';
import { MixpanelTrackingMapper } from '../../providers/mixpanel/mixpanel-mapper';
import { mixPlanBuilder } from '../builders/plan-data.builder';

export class LoadAttendeeListMapper implements MixpanelTrackingMapper<LoadAttendeeListEvent> {
  map(event: LoadAttendeeListEvent): MixpanelEvent {
    return new MixpanelEvent('load_attendee_list', mixPlanBuilder(event.data));
  }
}
