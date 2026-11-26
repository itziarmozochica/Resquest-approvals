import { LoadReservationPurchaseConfirmationEvent } from '../../core/events/load-reservation-purchase-confirmation';
import { MixpanelEvent } from '../../providers/mixpanel/mixpanel-event';
import { MixpanelTrackingMapper } from '../../providers/mixpanel/mixpanel-mapper';

export class LoadReservationPurchaseConfirmationMapper implements MixpanelTrackingMapper<LoadReservationPurchaseConfirmationEvent> {
  map(event: LoadReservationPurchaseConfirmationEvent): MixpanelEvent {
    return new MixpanelEvent('load_reservation_purchase_confirmation', event.data);
  }
}
