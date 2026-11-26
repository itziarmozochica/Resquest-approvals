import { TrackingEvent } from '../../tracking-event';
import { TrackingEvents } from '../tracking-events';

export interface RequestReassignTicketSeatingPaginationData {
  page: number;
  page_size: number;
}

export class RequestReassignTicketSeatingPaginationEvent extends TrackingEvent<RequestReassignTicketSeatingPaginationData> {
  constructor(readonly data: RequestReassignTicketSeatingPaginationData) {
    super(TrackingEvents.RequestReassignTicketSeatingPagination, data);
  }
}
