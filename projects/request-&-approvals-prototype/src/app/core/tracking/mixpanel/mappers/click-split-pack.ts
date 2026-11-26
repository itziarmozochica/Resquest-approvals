import { ClickSplitPackEvent } from '../../core/events/click-split-pack';
import { MixpanelEvent } from '../../providers/mixpanel/mixpanel-event';
import { MixpanelTrackingMapper } from '../../providers/mixpanel/mixpanel-mapper';
import { mixPlanBuilder } from '../builders/plan-data.builder';

export class ClickSplitPackMapper implements MixpanelTrackingMapper<ClickSplitPackEvent> {
  map(event: ClickSplitPackEvent): MixpanelEvent {
    return new MixpanelEvent('FZ|Cancellation|SplitPack', mixPlanBuilder(event.data));
  }
}
