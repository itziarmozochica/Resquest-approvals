import { TrackingEvent } from '../../tracking-event';
import { TrackingEvents } from '../tracking-events';

export interface UpdateCashRegisterData {
  cash_register_id: string;
  place_id: number;
}

export class UpdateCashRegisterEvent extends TrackingEvent<UpdateCashRegisterData> {
  constructor(readonly data: UpdateCashRegisterData) {
    super(TrackingEvents.UpdateCashRegister, data);
  }
}
