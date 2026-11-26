import { TrackingEvent } from '../../tracking-event';
import { TrackingEvents } from '../tracking-events';

export interface ConfirmStopRestartSessionData {
  plan_id: number;
  session_id: number;
  session_name: string;
  session_date: string;
  is_stopped: boolean;
}

export class ConfirmStopRestartSessionEvent extends TrackingEvent<ConfirmStopRestartSessionData> {
  constructor(readonly data: ConfirmStopRestartSessionData) {
    super(TrackingEvents.ConfirmStopRestartSession, data);
  }
}
