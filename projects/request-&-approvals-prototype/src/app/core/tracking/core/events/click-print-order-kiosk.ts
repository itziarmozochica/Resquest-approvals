import { TrackingEvent } from '../../tracking-event';
import { TrackingEvents } from '../tracking-events';
import { ClickNewOrderData } from './click-new-order';

export class ClickPrintOrderKioskEvent extends TrackingEvent<ClickNewOrderData> {
  constructor(readonly data: ClickNewOrderData) {
    super(TrackingEvents.ClickPrintOrderKiosk, data);
  }
}
