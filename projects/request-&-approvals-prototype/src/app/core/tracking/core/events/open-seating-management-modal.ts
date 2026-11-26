import { SeatingSummaryBySession } from '../../../../modules/seating-management/list-events/models/seating-summary-by-session.model';
import { TrackingEvent } from '../../tracking-event';
import { TrackingEvents } from '../tracking-events';

export interface OpenSeatingManagementModalData {
  selectedPlan: {
    id: number;
    title: string;
  };
  datetimeOfEvent: string;
  sessionsInformation: Array<SeatingSummaryBySession>;
}

export class OpenSeatingManagementModalEvent extends TrackingEvent<OpenSeatingManagementModalData> {
  constructor(readonly data: OpenSeatingManagementModalData) {
    super(TrackingEvents.OpenSeatingManagementModal, data);
  }
}
