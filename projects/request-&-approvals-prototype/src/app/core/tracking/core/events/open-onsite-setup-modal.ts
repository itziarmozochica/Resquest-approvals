import { TrackingEvent } from '../../tracking-event';
import { TrackingEvents } from '../tracking-events';

interface OpenOnsiteSetupModalData {
  manual: boolean;
}

export class OpenOnsiteSetupModalEvent extends TrackingEvent<OpenOnsiteSetupModalData> {
  constructor(readonly data: OpenOnsiteSetupModalData) {
    super(TrackingEvents.OpenOnsiteSetupModal, data);
  }
}
