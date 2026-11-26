import { TrackingEvent } from '../../tracking-event';
import { TrackingEvents } from '../tracking-events';

export interface ResetUserPasswordData {
  name: string;
  email: string;
  role: string;
}

export class ResetUserPasswordEvent extends TrackingEvent<ResetUserPasswordData> {
  constructor(readonly data: ResetUserPasswordData) {
    super(TrackingEvents.ResetUserPassword, data);
  }
}
