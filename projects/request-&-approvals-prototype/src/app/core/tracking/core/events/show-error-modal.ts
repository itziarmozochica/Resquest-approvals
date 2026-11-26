import { TrackingEvent } from '../../tracking-event';
import { TrackingEvents } from '../tracking-events';

export interface ShowErrorModalData {
  title: string;
  messages: string;
  code_error?: string;
}

export class ShowErrorModalEvent extends TrackingEvent<ShowErrorModalData> {
  constructor(readonly data: ShowErrorModalData) {
    super(TrackingEvents.ShowErrorModal, data);
  }
}
