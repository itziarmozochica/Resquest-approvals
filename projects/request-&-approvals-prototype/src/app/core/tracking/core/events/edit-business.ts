import { BusinessTypeEnum } from '../../../../modules/settings/shared/models/business-type.enum';
import { TrackingEvent } from '../../tracking-event';
import { TrackingEvents } from '../tracking-events';

export interface EditBusinessData {
  user_id: string;
  business_id: string;
  business_name: string;
  business_type: BusinessTypeEnum;
  email: string;
  is_manager: boolean;
}

export class EditBusinessEvent extends TrackingEvent<EditBusinessData> {
  constructor(readonly data: EditBusinessData) {
    super(TrackingEvents.EditBusiness, data);
  }
}
