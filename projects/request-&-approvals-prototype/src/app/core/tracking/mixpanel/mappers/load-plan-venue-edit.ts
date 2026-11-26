import { LoadPlanVenueEditEvent } from '../../core/events/load-plan-venue-edit';
import { MixpanelEvent } from '../../providers/mixpanel/mixpanel-event';
import { MixpanelTrackingMapper } from '../../providers/mixpanel/mixpanel-mapper';
import { mixPlanBuilder } from '../builders/plan-data.builder';

export class LoadPlanVenueEditMapper implements MixpanelTrackingMapper<LoadPlanVenueEditEvent> {
  map(event: LoadPlanVenueEditEvent): MixpanelEvent {
    return new MixpanelEvent('load_plan_venue_edit', mixPlanBuilder(event.data));
  }
}
