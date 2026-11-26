import { InvitationsCsvDownloadCompletedEvent } from '../../core/events/invitations-csv-download-completed';
import { MixpanelEvent } from '../../providers/mixpanel/mixpanel-event';
import { MixpanelTrackingMapper } from '../../providers/mixpanel/mixpanel-mapper';

export class InvitationsCsvDownloadCompletedMapper implements MixpanelTrackingMapper<InvitationsCsvDownloadCompletedEvent> {
  map(event: InvitationsCsvDownloadCompletedEvent): MixpanelEvent {
    return new MixpanelEvent('invitations_csv_download_completed', event.data);
  }
}
