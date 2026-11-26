import { DownloadOrdersEvent } from '../../core/events/download-orders';
import { MixpanelEvent } from '../../providers/mixpanel/mixpanel-event';
import { MixpanelTrackingMapper } from '../../providers/mixpanel/mixpanel-mapper';

export class DownloadOrdersMapper implements MixpanelTrackingMapper<DownloadOrdersEvent> {
  map(event: DownloadOrdersEvent): MixpanelEvent {
    return new MixpanelEvent('download_orders', event.data);
  }
}
