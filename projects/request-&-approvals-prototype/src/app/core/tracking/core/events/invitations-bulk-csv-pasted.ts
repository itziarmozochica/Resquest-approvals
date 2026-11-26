import { TrackingEvent } from '../../tracking-event';
import { TrackingEvents } from '../tracking-events';

export interface InvitationsBulkCsvPastedData {
  plan_id: number;
  rows_count: number;
  valid_count: number;
  invalid_count: number;
  has_error?: boolean;
}

export class InvitationsBulkCsvPastedEvent extends TrackingEvent<InvitationsBulkCsvPastedData> {
  constructor(readonly data: InvitationsBulkCsvPastedData) {
    super(TrackingEvents.InvitationsBulkCsvPasted, data);
  }
}
