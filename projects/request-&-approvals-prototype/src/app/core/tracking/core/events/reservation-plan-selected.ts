import { ReservationFlowTypeEnum } from '@fz-original/app/modules/reservation/models/reservation_flow_type.enum';

import { TrackingEvent } from '../../tracking-event';
import { TrackingEvents } from '../tracking-events';

export interface ReservationPlanSelectedData {
  reservation_flow_type: ReservationFlowTypeEnum;
}

export class ReservationPlanSelectedEvent extends TrackingEvent<ReservationPlanSelectedData> {
  constructor(readonly data: ReservationPlanSelectedData) {
    super(TrackingEvents.ReservationPlanSelected, data);
  }
}
