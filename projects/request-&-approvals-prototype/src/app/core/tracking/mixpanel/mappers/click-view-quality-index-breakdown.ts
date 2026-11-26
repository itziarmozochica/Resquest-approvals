import { ClickViewQualityIndexBreakdownEvent } from '../../core/events/click-view-quality-index-breakdown';
import { MixpanelEvent } from '../../providers/mixpanel/mixpanel-event';
import { MixpanelTrackingMapper } from '../../providers/mixpanel/mixpanel-mapper';

export class ClickViewQualityIndexBreakdownMapper implements MixpanelTrackingMapper<ClickViewQualityIndexBreakdownEvent> {
  map(event: ClickViewQualityIndexBreakdownEvent): MixpanelEvent {
    return new MixpanelEvent('click_view_quality_index_breakdown', event.data);
  }
}
