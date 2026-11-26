import { ViewTicketEvent } from '../../core/events/view-ticket';
import { MixpanelEvent } from '../../providers/mixpanel/mixpanel-event';
import { MixpanelTrackingMapper } from '../../providers/mixpanel/mixpanel-mapper';

export class ViewTicketMapper implements MixpanelTrackingMapper<ViewTicketEvent> {
  map(event: ViewTicketEvent): MixpanelEvent {
    return new MixpanelEvent('view_ticket', event.data);
  }
}
