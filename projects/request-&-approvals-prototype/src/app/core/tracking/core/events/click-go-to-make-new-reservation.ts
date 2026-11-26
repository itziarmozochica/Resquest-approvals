import { ReservationFlowTypeEnum } from '@fz-original/app/modules/reservation/models/reservation_flow_type.enum';

import { ClickGoToMakeNewReservationSourceEnum } from '../../../../modules/reservation/models/click-go-to-make-new-reservation-source.enum';
import { TrackingEvent } from '../../tracking-event';
import { TrackingEvents } from '../tracking-events';

export interface ClickGoToMakeNewReservationData {
  source: ClickGoToMakeNewReservationSourceEnum;
  channel: string;
  business_type?: string;
  reservation_flow_type?: ReservationFlowTypeEnum;
}

export class ClickGoToMakeNewReservationEvent extends TrackingEvent<ClickGoToMakeNewReservationData> {
  constructor(readonly data: ClickGoToMakeNewReservationData) {
    super(TrackingEvents.ClickGoToMakeNewReservation, data);
  }
}
