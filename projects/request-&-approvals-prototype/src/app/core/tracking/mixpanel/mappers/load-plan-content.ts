import { LoadPlanContentEvent } from '../../core/events/load-plan-content';
import { MixpanelEvent } from '../../providers/mixpanel/mixpanel-event';
import { MixpanelTrackingMapper } from '../../providers/mixpanel/mixpanel-mapper';

export class LoadPlanContentMapper implements MixpanelTrackingMapper<LoadPlanContentEvent> {
  map(event: LoadPlanContentEvent): MixpanelEvent {
    return new MixpanelEvent('load_plan_content', event.data);
  }
}
