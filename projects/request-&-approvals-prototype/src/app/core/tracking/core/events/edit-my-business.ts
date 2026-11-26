import { BusinessTypeEnum } from '../../../../modules/settings/shared/models/business-type.enum';
import { TrackingEvent } from '../../tracking-event';
import { TrackingEvents } from '../tracking-events';

export interface EditMyBusinessData {
  user_id: string;
  business_id: string;
  business_name: string;
  business_type: BusinessTypeEnum;
  email: string;
  channel: string;
  is_manager: boolean;
}

export class EditMyBusinessEvent extends TrackingEvent<EditMyBusinessData> {
  constructor(readonly data: EditMyBusinessData) {
    super(TrackingEvents.EditMyBusiness, data);
  }
}
