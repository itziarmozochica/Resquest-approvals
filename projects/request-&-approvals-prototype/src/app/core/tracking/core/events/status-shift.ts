import { ShiftStatus } from '../../../../modules/box-office/shared/models/shifts.model';
import { TrackingEvent } from '../../tracking-event';
import { TrackingEvents } from '../tracking-events';

export interface StatusShiftData {
  status: ShiftStatus;
  cash_register_name?: string;
  start_time?: string;
  currency?: string;
}

export class StatusShiftEvent extends TrackingEvent<StatusShiftData> {
  constructor(readonly data: StatusShiftData) {
    super(TrackingEvents.StatusShift, data);
  }
}
