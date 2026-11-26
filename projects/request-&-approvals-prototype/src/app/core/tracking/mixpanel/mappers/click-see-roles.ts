import { ClickSeeRolesEvent } from '../../core/events/click-see-roles';
import { MixpanelEvent } from '../../providers/mixpanel/mixpanel-event';
import { MixpanelTrackingMapper } from '../../providers/mixpanel/mixpanel-mapper';
import { TrackingEvent } from '../../tracking-event';

export class ClickSeeRolesMapper implements MixpanelTrackingMapper<ClickSeeRolesEvent> {
  map(event: TrackingEvent<any>): MixpanelEvent {
    return new MixpanelEvent('click_see_roles', event.data);
  }
}
