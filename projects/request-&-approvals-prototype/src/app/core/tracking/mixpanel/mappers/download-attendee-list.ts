import { DownloadAttendeeListEvent } from '../../core/events/download-attendee-list';
import { MixpanelEvent } from '../../providers/mixpanel/mixpanel-event';
import { MixpanelTrackingMapper } from '../../providers/mixpanel/mixpanel-mapper';
import { mixPlanBuilder } from '../builders/plan-data.builder';

export class DownloadAttenddeListMapper implements MixpanelTrackingMapper<DownloadAttendeeListEvent> {
  map(event: DownloadAttendeeListEvent): MixpanelEvent {
    return new MixpanelEvent('download_attendee_list', mixPlanBuilder(event.data));
  }
}
