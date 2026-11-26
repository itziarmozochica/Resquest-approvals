import { TrackingEvent } from '../../tracking-event';
import { TrackingEvents } from '../tracking-events';

export interface ConfirmCancellationData {
  order: number;
  comment: string;
  reimbursementType: string;
  isTotalCancellation: boolean;
  error: boolean;
}
export class ConfirmCancellationEvent extends TrackingEvent<ConfirmCancellationData> {
  constructor(readonly data: ConfirmCancellationData) {
    super(TrackingEvents.ConfirmCancellation, data);
  }
}
