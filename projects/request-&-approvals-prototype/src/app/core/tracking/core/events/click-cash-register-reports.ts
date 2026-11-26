import { TrackingEvent } from '../../tracking-event';
import { TrackingEvents } from '../tracking-events';

export class ClickCashRegisterReportsEvent extends TrackingEvent<void> {
  constructor() {
    super(TrackingEvents.ClickCashRegisterReports);
  }
}
