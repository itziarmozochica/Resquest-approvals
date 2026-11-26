import { ConcessionCategoryEnum } from '@fz-original/app/modules/resellers/models/concession-category.enum';

import { TrackingEvent } from '../../tracking-event';
import { TrackingEvents } from '../tracking-events';

export interface ClickResellerReportsEventData {
  role: string;
  concession_category?: ConcessionCategoryEnum;
}

export class ClickResellerReportsEvent extends TrackingEvent<ClickResellerReportsEventData> {
  constructor(readonly data: ClickResellerReportsEventData) {
    super(TrackingEvents.ClickResellerReports, data);
  }
}
