import { LoadAmbassadorsRegisterPageEvent } from '../../core/events/load-ambassadors-register-page';
import { MixpanelEvent } from '../../providers/mixpanel/mixpanel-event';
import { MixpanelTrackingMapper } from '../../providers/mixpanel/mixpanel-mapper';

export class LoadAmbassadorsRegisterPageMapper implements MixpanelTrackingMapper<LoadAmbassadorsRegisterPageEvent> {
  map(event: LoadAmbassadorsRegisterPageEvent): MixpanelEvent {
    return new MixpanelEvent('load_ambassadors_register_page', event.data);
  }
}
