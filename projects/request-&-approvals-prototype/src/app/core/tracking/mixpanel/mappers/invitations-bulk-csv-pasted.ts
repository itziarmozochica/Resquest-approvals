import { InvitationsBulkCsvPastedEvent } from '../../core/events/invitations-bulk-csv-pasted';
import { MixpanelEvent } from '../../providers/mixpanel/mixpanel-event';
import { MixpanelTrackingMapper } from '../../providers/mixpanel/mixpanel-mapper';

export class InvitationsBulkCsvPastedMapper implements MixpanelTrackingMapper<InvitationsBulkCsvPastedEvent> {
  map(event: InvitationsBulkCsvPastedEvent): MixpanelEvent {
    return new MixpanelEvent('invitations_bulk_csv_pasted', event.data);
  }
}
