import { SendPlanRequestEvent } from '../../core/events/send-plan-request';
import { MixpanelEvent } from '../../providers/mixpanel/mixpanel-event';
import { MixpanelTrackingMapper } from '../../providers/mixpanel/mixpanel-mapper';
import { TrackingEvent } from '../../tracking-event';

export class SendPlanRequestMapper implements MixpanelTrackingMapper<SendPlanRequestEvent> {
  map(event: TrackingEvent<any>): MixpanelEvent {
    return new MixpanelEvent('send_plan_request', event.data);
  }
}
