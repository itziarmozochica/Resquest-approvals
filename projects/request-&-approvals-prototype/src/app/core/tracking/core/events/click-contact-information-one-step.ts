import { TrackingEvent } from '../../tracking-event';
import { TrackingEvents } from '../tracking-events';

export interface ClickContactInformationOnStepData {
  plan_id: number;
  partner_name: string;
  cashier_name: string;
  cashier_email: string;
  action: 'cancel' | 'checkout';
}

export class ClickContactInformationOnStepEvent extends TrackingEvent<ClickContactInformationOnStepData> {
  constructor(readonly data: ClickContactInformationOnStepData) {
    super(TrackingEvents.ClickContactInformationOneStep, data);
  }
}
