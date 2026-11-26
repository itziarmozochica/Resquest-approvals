import { ClickSessionScheduleEvent } from '../../core/events/click-session-schedule';
import { MixpanelEvent } from '../../providers/mixpanel/mixpanel-event';
import { MixpanelTrackingMapper } from '../../providers/mixpanel/mixpanel-mapper';
import { mixPlanBuilder } from '../builders/plan-data.builder';

export class ClickSessionScheduleMapper implements MixpanelTrackingMapper<ClickSessionScheduleEvent> {
  map(event: ClickSessionScheduleEvent): MixpanelEvent {
    return new MixpanelEvent('click_session_schedule', mixPlanBuilder(event.data));
  }
}
