import { DeleteCashRegisterEvent } from '../../core/events/delete-cash-register';
import { MixpanelEvent } from '../../providers/mixpanel/mixpanel-event';
import { MixpanelTrackingMapper } from '../../providers/mixpanel/mixpanel-mapper';
import { TrackingEvent } from '../../tracking-event';

export class DeleteCashRegisterMapper implements MixpanelTrackingMapper<DeleteCashRegisterEvent> {
  map(event: TrackingEvent<any>): MixpanelEvent {
    return new MixpanelEvent('delete_cash_register', event.data);
  }
}
