import { ConfirmReportReviewEvent } from '../../core/events/confirm-report-review';
import { MixpanelEvent } from '../../providers/mixpanel/mixpanel-event';
import { MixpanelTrackingMapper } from '../../providers/mixpanel/mixpanel-mapper';

export class ConfirmReportReviewMapper implements MixpanelTrackingMapper<ConfirmReportReviewEvent> {
  map(event: ConfirmReportReviewEvent): MixpanelEvent {
    return new MixpanelEvent('confirm_report_review', event.data);
  }
}
