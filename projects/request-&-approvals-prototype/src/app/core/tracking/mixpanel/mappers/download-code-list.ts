import { DownloadCodeListEvent } from '../../core/events/download-code-list';
import { MixpanelEvent } from '../../providers/mixpanel/mixpanel-event';
import { MixpanelTrackingMapper } from '../../providers/mixpanel/mixpanel-mapper';
import { mixPlanBuilder } from '../builders/plan-data.builder';

export class DownloadCodeListMapper implements MixpanelTrackingMapper<DownloadCodeListEvent> {
  map(event: DownloadCodeListEvent): MixpanelEvent {
    return new MixpanelEvent('download_code_list', mixPlanBuilder(event.data));
  }
}
