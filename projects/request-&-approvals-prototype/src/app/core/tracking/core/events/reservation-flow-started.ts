import { ReservationFlowTypeEnum } from '@fz-original/app/modules/reservation/models/reservation_flow_type.enum';

import { TrackingEvent } from '../../tracking-event';
import { TrackingEvents } from '../tracking-events';

export interface ReservationFlowStartedData {
  reservation_flow_type: ReservationFlowTypeEnum;
}

export class ReservationFlowStartedEvent extends TrackingEvent<ReservationFlowStartedData> {
  constructor(readonly data: ReservationFlowStartedData) {
    super(TrackingEvents.ReservationFlowStarted, data);
  }
}
