import { EditBusinessBalanceEvent } from '../../core/events/edit-business-balance';
import { MixpanelEvent } from '../../providers/mixpanel/mixpanel-event';
import { MixpanelTrackingMapper } from '../../providers/mixpanel/mixpanel-mapper';

export class EditBusinessBalanceMapper implements MixpanelTrackingMapper<EditBusinessBalanceEvent> {
  map(event: EditBusinessBalanceEvent): MixpanelEvent {
    return new MixpanelEvent('edit_business_balance', event.data);
  }
}
