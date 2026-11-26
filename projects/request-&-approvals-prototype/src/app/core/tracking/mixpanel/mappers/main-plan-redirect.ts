import { MainPlanRedirectEvent } from '../../core/events/main-plan-redirect';
import { MixpanelEvent } from '../../providers/mixpanel/mixpanel-event';
import { MixpanelTrackingMapper } from '../../providers/mixpanel/mixpanel-mapper';
import { mixPlanBuilder } from '../builders/plan-data.builder';

export class MainPlanRedirectMapper implements MixpanelTrackingMapper<MainPlanRedirectEvent> {
  map(event: MainPlanRedirectEvent): MixpanelEvent {
    return new MixpanelEvent('main_plan_redirect', mixPlanBuilder(event.data));
  }
}
