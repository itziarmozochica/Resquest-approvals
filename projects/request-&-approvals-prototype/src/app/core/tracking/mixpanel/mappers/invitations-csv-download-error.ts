import { InvitationsCsvDownloadErrorEvent } from '../../core/events/invitations-csv-download-error';
import { MixpanelEvent } from '../../providers/mixpanel/mixpanel-event';
import { MixpanelTrackingMapper } from '../../providers/mixpanel/mixpanel-mapper';

export class InvitationsCsvDownloadErrorMapper implements MixpanelTrackingMapper<InvitationsCsvDownloadErrorEvent> {
  map(event: InvitationsCsvDownloadErrorEvent): MixpanelEvent {
    return new MixpanelEvent('invitations_csv_download_error', event.data);
  }
}
