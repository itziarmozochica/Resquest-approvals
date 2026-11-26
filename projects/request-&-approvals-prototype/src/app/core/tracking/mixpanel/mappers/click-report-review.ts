import { ClickReportReviewEvent } from '../../core/events/click-report-review';
import { MixpanelEvent } from '../../providers/mixpanel/mixpanel-event';
import { MixpanelTrackingMapper } from '../../providers/mixpanel/mixpanel-mapper';

export class ClickReportReviewMapper implements MixpanelTrackingMapper<ClickReportReviewEvent> {
  map(event: ClickReportReviewEvent): MixpanelEvent {
    return new MixpanelEvent('click_report_review', event.data);
  }
}
