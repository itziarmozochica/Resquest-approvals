import { ConfirmBillingDownloadEvent } from '../../core/events/confirm-billing-download';
import { MixpanelEvent } from '../../providers/mixpanel/mixpanel-event';
import { MixpanelTrackingMapper } from '../../providers/mixpanel/mixpanel-mapper';
import { TrackingEvent } from '../../tracking-event';

export class ConfirmBillingDownloadMapper implements MixpanelTrackingMapper<ConfirmBillingDownloadEvent> {
  map(event: TrackingEvent<any>): MixpanelEvent {
    return new MixpanelEvent('confirm_billing_download', event.data);
  }
}
