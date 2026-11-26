import { BusinessTypeEnum } from '../../../../modules/settings/shared/models/business-type.enum';
import { TrackingEvent } from '../../tracking-event';
import { TrackingEvents } from '../tracking-events';

export interface CreateBusinessData {
  user_id: string;
  business_name: string;
  business_type: BusinessTypeEnum;
  email: string;
  is_manager: boolean;
}

export class CreateBusinessEvent extends TrackingEvent<CreateBusinessData> {
  constructor(readonly data: CreateBusinessData) {
    super(TrackingEvents.CreateBusiness, data);
  }
}
