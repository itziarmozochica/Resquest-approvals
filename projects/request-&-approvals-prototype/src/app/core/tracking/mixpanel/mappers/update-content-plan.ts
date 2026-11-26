import { UpdateContentPlanEvent } from '../../core/events/update-content-plan';
import { MixpanelEvent } from '../../providers/mixpanel/mixpanel-event';
import { MixpanelTrackingMapper } from '../../providers/mixpanel/mixpanel-mapper';

export class UpdateContentPlanMapper implements MixpanelTrackingMapper<UpdateContentPlanEvent> {
  map(event: UpdateContentPlanEvent): MixpanelEvent {
    return new MixpanelEvent('update_content_plan', event.data);
  }
}
