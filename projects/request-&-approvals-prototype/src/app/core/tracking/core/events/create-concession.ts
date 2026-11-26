import { ConcessionCategoryEnum } from '../../../../modules/resellers/models/concession-category.enum';
import { ConcessionTypeEnum } from '../../../../modules/resellers/models/concession-type.enum';
import { TrackingEvent } from '../../tracking-event';
import { TrackingEvents } from '../tracking-events';

export interface CreateConcessionData {
  user_id: string;
  concession_name: string;
  concession_type: ConcessionTypeEnum;
  concession_category: ConcessionCategoryEnum;
  partner_id: number;
  reseller_id: number;
}

export class CreateConcessionEvent extends TrackingEvent<CreateConcessionData> {
  constructor(readonly data: CreateConcessionData) {
    super(TrackingEvents.CreateConcession, data);
  }
}
