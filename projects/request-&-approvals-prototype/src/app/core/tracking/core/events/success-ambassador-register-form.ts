import { TrackingEvent } from '../../tracking-event';
import { TrackingEvents } from '../tracking-events';

export interface SuccessAmbassadorRegisterFormData {
  email: string;
  name: string;
  plan_id?: number;
  program_id?: string;
}

export class SuccessAmbassadorRegisterFormEvent extends TrackingEvent<SuccessAmbassadorRegisterFormData> {
  constructor(readonly data: SuccessAmbassadorRegisterFormData) {
    super(TrackingEvents.SuccessAmbassadorRegisterForm, data);
  }
}
