import { TrackingEvent } from '../../tracking-event';
import { TrackingEvents } from '../tracking-events';

export interface LoadAmbassadorsRegisterPageEventData {
  plan_id?: number;
  program_id?: string;
}

export class LoadAmbassadorsRegisterPageEvent extends TrackingEvent<LoadAmbassadorsRegisterPageEventData> {
  constructor(readonly data: LoadAmbassadorsRegisterPageEventData) {
    super(TrackingEvents.LoadAmbassadorsRegisterPage, data);
  }
}
