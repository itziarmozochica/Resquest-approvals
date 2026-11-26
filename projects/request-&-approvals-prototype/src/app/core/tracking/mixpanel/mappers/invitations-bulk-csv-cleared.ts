import { InvitationsBulkCsvClearedEvent } from '../../core/events/invitations-bulk-csv-cleared';
import { MixpanelEvent } from '../../providers/mixpanel/mixpanel-event';
import { MixpanelTrackingMapper } from '../../providers/mixpanel/mixpanel-mapper';

export class InvitationsBulkCsvClearedMapper implements MixpanelTrackingMapper<InvitationsBulkCsvClearedEvent> {
  map(event: InvitationsBulkCsvClearedEvent): MixpanelEvent {
    return new MixpanelEvent('invitations_bulk_csv_cleared', event.data);
  }
}
