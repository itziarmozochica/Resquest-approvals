import { TrackingEvent } from '../../tracking-event';
import { TrackingEvents } from '../tracking-events';

export interface ConfirmEditPriceData {
  plan_id: number;
  session_id: number;
  session_name: string;
  session_date: string;
  previous_price: number;
  new_price: number;
  currency: string;
  with_confirmation_modal: boolean;
}

export class ConfirmEditPriceEvent extends TrackingEvent<ConfirmEditPriceData> {
  constructor(readonly data: ConfirmEditPriceData) {
    super(TrackingEvents.ConfirmEditPrice, data);
  }
}
