import { TrackingEvent } from '../../tracking-event';
import { TrackingEvents } from '../tracking-events';

export interface ClickKioskOrderConfirmationData {
  orderId: string;
}

export class ClickKioskOrderConfirmationEvent extends TrackingEvent<ClickKioskOrderConfirmationData> {
  constructor(readonly data: ClickKioskOrderConfirmationData) {
    super(TrackingEvents.ClickKioskOrderConfirmation, data);
  }
}
