import { SaveBulkEditEvent } from '../../core/events/save-bulk-edit';
import { MixpanelEvent } from '../../providers/mixpanel/mixpanel-event';
import { MixpanelTrackingMapper } from '../../providers/mixpanel/mixpanel-mapper';
import { mixPlanBuilder } from '../builders/plan-data.builder';

export class SaveBulkEditMapper implements MixpanelTrackingMapper<SaveBulkEditEvent> {
  map(event: SaveBulkEditEvent): MixpanelEvent {
    return new MixpanelEvent('save_bulk_edit', mixPlanBuilder(event.data));
  }
}
