import { LoadPlanListEvent } from '../../core/events/load-plan-list';
import { MixpanelEvent } from '../../providers/mixpanel/mixpanel-event';
import { MixpanelTrackingMapper } from '../../providers/mixpanel/mixpanel-mapper';

export class LoadPlanListMapper implements MixpanelTrackingMapper<LoadPlanListEvent> {
  map(event: LoadPlanListEvent): MixpanelEvent {
    return new MixpanelEvent('load_plan_list', event.data);
  }
}
