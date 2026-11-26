import { ReservationFlowTypeEnum } from '@fz-original/app/modules/reservation/models/reservation_flow_type.enum';

import { TrackingEvent } from '../../tracking-event';
import { TrackingEvents } from '../tracking-events';

export interface ReservationBusinessSelectedData {
  reservation_flow_type: ReservationFlowTypeEnum;
}

export class ReservationBusinessSelectedEvent extends TrackingEvent<ReservationBusinessSelectedData> {
  constructor(readonly data: ReservationBusinessSelectedData) {
    super(TrackingEvents.ReservationBusinessSelected, data);
  }
}
