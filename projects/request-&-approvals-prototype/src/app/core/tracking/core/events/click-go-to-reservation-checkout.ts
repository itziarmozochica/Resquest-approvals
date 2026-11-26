import { ReservationFlowTypeEnum } from '@fz-original/app/modules/reservation/models/reservation_flow_type.enum';

import { PayReservationSource } from '../../../../modules/reservation/models/pay-reservation-source.enum';
import { BusinessTypeEnum } from '../../../../modules/settings/shared/models/business-type.enum';
import { TrackingEvent } from '../../tracking-event';
import { TrackingEvents } from '../tracking-events';

export interface ClickGoToReservationCheckoutData {
  source: PayReservationSource;
  cart_id: string | undefined;
  plan_id: number | undefined;
  reservation_id?: string;
  channel: string;
  business_type?: BusinessTypeEnum;
  reservation_flow_type?: ReservationFlowTypeEnum;
}

export class ClickGoToReservationCheckoutEvent extends TrackingEvent<ClickGoToReservationCheckoutData> {
  constructor(readonly data: ClickGoToReservationCheckoutData) {
    super(TrackingEvents.ClickGoToReservationCheckout, data);
  }
}
