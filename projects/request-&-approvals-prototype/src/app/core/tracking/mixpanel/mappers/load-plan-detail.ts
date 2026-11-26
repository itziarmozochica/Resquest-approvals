import { LoadPlanDetailEvent } from '../../core/events/load-plan-detail';
import { MixpanelEvent } from '../../providers/mixpanel/mixpanel-event';
import { MixpanelTrackingMapper } from '../../providers/mixpanel/mixpanel-mapper';

export class LoadPlanDetailMapper implements MixpanelTrackingMapper<LoadPlanDetailEvent> {
  map(event: LoadPlanDetailEvent): MixpanelEvent {
    return new MixpanelEvent('load_plan_detail', event.data);
  }
}
