import { UpdatePublishedSessionTypesInChannelEvent } from '../../core/events/update-published-session-types-in-channel';
import { MixpanelEvent } from '../../providers/mixpanel/mixpanel-event';
import { MixpanelTrackingMapper } from '../../providers/mixpanel/mixpanel-mapper';

export class UpdatePublishedSessionTypesInChannelMapper implements MixpanelTrackingMapper<UpdatePublishedSessionTypesInChannelEvent> {
  map(event: UpdatePublishedSessionTypesInChannelEvent): MixpanelEvent {
    return new MixpanelEvent('update_published_session_types_in_channel', event.data);
  }
}
