import { TrackingEvent } from '../../tracking-event';
import { TrackingEvents } from '../tracking-events';

export interface ErrorAmbassadorRegisterFormData {
  email: string;
  name: string;
  plan_id?: number;
  program_id?: string;
}

export class ErrorAmbassadorRegisterFormEvent extends TrackingEvent<ErrorAmbassadorRegisterFormData> {
  constructor(readonly data: ErrorAmbassadorRegisterFormData) {
    super(TrackingEvents.ErrorAmbassadorRegisterForm, data);
  }
}
