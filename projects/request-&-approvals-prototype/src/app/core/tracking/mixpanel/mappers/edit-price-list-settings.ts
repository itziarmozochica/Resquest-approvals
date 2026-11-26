import { EditPriceListSettingsEvent } from '../../core/events/edit-price-list-settings';
import { MixpanelEvent } from '../../providers/mixpanel/mixpanel-event';
import { MixpanelTrackingMapper } from '../../providers/mixpanel/mixpanel-mapper';

export class EditPriceListSettingsMapper implements MixpanelTrackingMapper<EditPriceListSettingsEvent> {
  map(event: EditPriceListSettingsEvent): MixpanelEvent {
    return new MixpanelEvent('edit_price_list_settings', event.data);
  }
}
