import { ConfirmBulkEditSessionsPerTimeslotEvent } from '../../core/events/confirm-bulk-edit-sessions-per-timeslot';
import { MixpanelEvent } from '../../providers/mixpanel/mixpanel-event';
import { MixpanelTrackingMapper } from '../../providers/mixpanel/mixpanel-mapper';

export class ConfirmBulkEditSessionsPerTimeslotMapper implements MixpanelTrackingMapper<ConfirmBulkEditSessionsPerTimeslotEvent> {
  map(event: ConfirmBulkEditSessionsPerTimeslotEvent): MixpanelEvent {
    return new MixpanelEvent('confirm_bulk_edit_sessions_per_timeslot', event.data);
  }
}
