import { LoadBulkEditEvent } from '../../core/events/load-bulk-edit';
import { MixpanelEvent } from '../../providers/mixpanel/mixpanel-event';
import { MixpanelTrackingMapper } from '../../providers/mixpanel/mixpanel-mapper';
import { mixPlanBuilder } from '../builders/plan-data.builder';

export class LoadBulkEditMapper implements MixpanelTrackingMapper<LoadBulkEditEvent> {
  map(event: LoadBulkEditEvent): MixpanelEvent {
    return new MixpanelEvent('load_bulk_edit', mixPlanBuilder(event.data));
  }
}
