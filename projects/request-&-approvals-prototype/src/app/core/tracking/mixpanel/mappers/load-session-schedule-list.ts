import { LoadSessionScheduleList } from '../../core/events/load-session-schedule-list';
import { MixpanelEvent } from '../../providers/mixpanel/mixpanel-event';
import { MixpanelTrackingMapper } from '../../providers/mixpanel/mixpanel-mapper';
import { mixPlanBuilder } from '../builders/plan-data.builder';

export class LoadSessionScheduleListMapper implements MixpanelTrackingMapper<LoadSessionScheduleList> {
  map(event: LoadSessionScheduleList): MixpanelEvent {
    return new MixpanelEvent('load_session_schedule_list', mixPlanBuilder(event.data));
  }
}
