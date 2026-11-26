import { SavePlanVenueEditEvent } from '../../core/events/save-plan-venue-edit';
import { MixpanelEvent } from '../../providers/mixpanel/mixpanel-event';
import { MixpanelTrackingMapper } from '../../providers/mixpanel/mixpanel-mapper';
import { mixPlanBuilder } from '../builders/plan-data.builder';

export class SavePlanVenueEditMapper implements MixpanelTrackingMapper<SavePlanVenueEditEvent> {
  map(event: SavePlanVenueEditEvent): MixpanelEvent {
    return new MixpanelEvent('save_plan_venue_edit', mixPlanBuilder(event.data));
  }
}
