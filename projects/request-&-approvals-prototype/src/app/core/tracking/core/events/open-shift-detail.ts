import { TrackingEvent } from '../../tracking-event';
import { TrackingEvents } from '../tracking-events';

export interface ShiftDetailData {
  shift_id: string;
  cashier_user_name: string;
  cashier_register_name: string;
  shift_start_date: string;
}

export class OpenShiftDetailEvent extends TrackingEvent<ShiftDetailData> {
  constructor(readonly data: ShiftDetailData) {
    super(TrackingEvents.OpenShiftDetail, data);
  }
}
