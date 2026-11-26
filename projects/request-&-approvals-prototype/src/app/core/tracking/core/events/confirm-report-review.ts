import { TrackingEvent } from '../../tracking-event';
import { TrackingEvents } from '../tracking-events';
import { ClickReportReviewData } from './click-report-review';

export interface ConfirmReportReviewData extends ClickReportReviewData {
  flagged_reason: string;
}

export class ConfirmReportReviewEvent extends TrackingEvent<ConfirmReportReviewData> {
  constructor(readonly data: ConfirmReportReviewData) {
    super(TrackingEvents.ConfirmReportReview, data);
  }
}
