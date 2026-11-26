import { BusinessTypeEnum } from '../../../../modules/settings/shared/models/business-type.enum';
import { TrackingEvent } from '../../tracking-event';
import { TrackingEvents } from '../tracking-events';

export interface ClickUserReservationsData {
  channel: string;
  business_type: BusinessTypeEnum;
}

export class ClickUserReservationsEvent extends TrackingEvent<ClickUserReservationsData> {
  constructor(readonly data: ClickUserReservationsData) {
    super(TrackingEvents.ClickUserReservations, data);
  }
}
