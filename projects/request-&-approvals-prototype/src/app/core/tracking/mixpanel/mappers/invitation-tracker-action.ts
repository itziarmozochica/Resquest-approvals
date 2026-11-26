import { InvitationTrackerActionEvent } from '../../core/events/invitation-tracker-action';
import { MixpanelEvent } from '../../providers/mixpanel/mixpanel-event';
import { MixpanelTrackingMapper } from '../../providers/mixpanel/mixpanel-mapper';

export class InvitationTrackerActionMapper implements MixpanelTrackingMapper<InvitationTrackerActionEvent> {
  constructor(public eventName: string) {}
  map(event: InvitationTrackerActionEvent): MixpanelEvent {
    return new MixpanelEvent(this.eventName, event.data);
  }
}
