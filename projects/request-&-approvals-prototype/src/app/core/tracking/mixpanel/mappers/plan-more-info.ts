import { PlanMoreInfoEvent } from '../../core/events/plan-more-info';
import { MixpanelEvent } from '../../providers/mixpanel/mixpanel-event';
import { MixpanelTrackingMapper } from '../../providers/mixpanel/mixpanel-mapper';

export class PlanMoreInfoMapper implements MixpanelTrackingMapper<PlanMoreInfoEvent> {
  map(event: PlanMoreInfoEvent): MixpanelEvent {
    return new MixpanelEvent('plan_more_info', event.data);
  }
}
