import { TrackingEvent } from '../../tracking-event';
import { TrackingEvents } from '../tracking-events';

export interface DeleteCashRegisterData {
  cash_register_id: string;
  place_id: number;
}

export class DeleteCashRegisterEvent extends TrackingEvent<DeleteCashRegisterData> {
  constructor(readonly data: DeleteCashRegisterData) {
    super(TrackingEvents.DeleteCashRegister, data);
  }
}
