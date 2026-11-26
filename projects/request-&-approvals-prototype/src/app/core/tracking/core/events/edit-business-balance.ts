import { BusinessTypeEnum } from '../../../../modules/settings/shared/models/business-type.enum';
import { TrackingEvent } from '../../tracking-event';
import { TrackingEvents } from '../tracking-events';
import { FieldUpdate } from './field-update';

export interface EditBusinessBalanceData {
  partner_id: number;
  user_id: string;
  business_id: string;
  business_email: string;
  business_type: BusinessTypeEnum;
  changes_made: FieldUpdate[];
}

export class EditBusinessBalanceEvent extends TrackingEvent<EditBusinessBalanceData> {
  constructor(readonly data: EditBusinessBalanceData) {
    super(TrackingEvents.EditBusinessBalance, data);
  }
}
