import { UpdateCashRegisterEvent } from '../../core/events/update-cash-register';
import { MixpanelEvent } from '../../providers/mixpanel/mixpanel-event';
import { MixpanelTrackingMapper } from '../../providers/mixpanel/mixpanel-mapper';
import { TrackingEvent } from '../../tracking-event';

export class UpdateCashRegisterMapper implements MixpanelTrackingMapper<UpdateCashRegisterEvent> {
  map(event: TrackingEvent<any>): MixpanelEvent {
    return new MixpanelEvent('update_cash_register', event.data);
  }
}
