import { TrackingEvent } from '../../tracking-event';
import { TrackingEvents } from '../tracking-events';

export interface InvitationsBulkCsvClearedData {
  plan_id: number;
}

export class InvitationsBulkCsvClearedEvent extends TrackingEvent<InvitationsBulkCsvClearedData> {
  constructor(readonly data: InvitationsBulkCsvClearedData) {
    super(TrackingEvents.InvitationsBulkCsvCleared, data);
  }
}
