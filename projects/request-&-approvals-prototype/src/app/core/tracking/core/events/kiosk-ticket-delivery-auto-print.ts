import { TrackingEvent } from '../../tracking-event';
import { TrackingEvents } from '../tracking-events';

export interface KioskTicketDeliveryAutoPrintData {
  order_id: number;
  partner_id: number;
  plan_id: number;
  place_id: number;
}

export class KioskTicketDeliveryAutoPrintEvent extends TrackingEvent<KioskTicketDeliveryAutoPrintData> {
  constructor(readonly data: KioskTicketDeliveryAutoPrintData) {
    super(TrackingEvents.KioskTicketDeliveryAutoPrint, data);
  }
}
