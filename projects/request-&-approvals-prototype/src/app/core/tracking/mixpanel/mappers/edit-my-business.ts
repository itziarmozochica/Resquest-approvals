import { EditMyBusinessEvent } from '../../core/events/edit-my-business';
import { MixpanelEvent } from '../../providers/mixpanel/mixpanel-event';
import { MixpanelTrackingMapper } from '../../providers/mixpanel/mixpanel-mapper';

export class EditMyBusinessMapper implements MixpanelTrackingMapper<EditMyBusinessEvent> {
  map(event: EditMyBusinessEvent): MixpanelEvent {
    return new MixpanelEvent('edit_my_business', event.data);
  }
}
