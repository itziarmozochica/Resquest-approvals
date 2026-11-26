import { LoadResellerPlanListEvent } from '../../core/events/load-reseller-plan-list';
import { MixpanelEvent } from '../../providers/mixpanel/mixpanel-event';
import { MixpanelTrackingMapper } from '../../providers/mixpanel/mixpanel-mapper';

export class LoadResellerPlanListMapper implements MixpanelTrackingMapper<LoadResellerPlanListEvent> {
  map(event: LoadResellerPlanListEvent): MixpanelEvent {
    return new MixpanelEvent('load_reseller_plan_list', event.data);
  }
}
