import { TicketMode } from '../../../../modules/kiosk/components/order-confirmation/order-confirmation.enum';
import { TrackingEvent } from '../../tracking-event';
import { TrackingEvents } from '../tracking-events';

export interface KioskTicketDeliveryClickData {
  order_id: number;
  option: TicketMode;
  has_email_only: boolean;
}

export class KioskTicketDeliveryClickEvent extends TrackingEvent<KioskTicketDeliveryClickData> {
  constructor(readonly data: KioskTicketDeliveryClickData) {
    super(TrackingEvents.KioskTicketDeliveryClick, data);
  }
}
