import { EditBusinessEvent } from '../../core/events/edit-business';
import { MixpanelEvent } from '../../providers/mixpanel/mixpanel-event';
import { MixpanelTrackingMapper } from '../../providers/mixpanel/mixpanel-mapper';

export class EditBusinessMapper implements MixpanelTrackingMapper<EditBusinessEvent> {
  map(event: EditBusinessEvent): MixpanelEvent {
    return new MixpanelEvent('edit_business', event.data);
  }
}
