import { TrackingEvent } from '../../tracking-event';
import { TrackingEvents } from '../tracking-events';

export interface NoShiftStartedModalData {
  start_shift?: boolean;
}

export class ShowNoShiftStartedModalEvent extends TrackingEvent<NoShiftStartedModalData> {
  constructor(readonly data?: NoShiftStartedModalData) {
    super(TrackingEvents.ShowNoShiftStartedModal, data);
  }
}

export class CloseNoShiftStartedModalEvent extends TrackingEvent<NoShiftStartedModalData> {
  constructor(readonly data: NoShiftStartedModalData) {
    super(TrackingEvents.CloseNoShiftStartedModal, data);
  }
}
