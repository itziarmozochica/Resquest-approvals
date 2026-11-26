import { OpenSeatingManagementModalEvent } from '@fz-original/app/core/tracking/core/events/open-seating-management-modal';

import { MixpanelEvent } from '../../providers/mixpanel/mixpanel-event';
import { MixpanelTrackingMapper } from '../../providers/mixpanel/mixpanel-mapper';

export class OpenSeatingManagementModalMapper implements MixpanelTrackingMapper<OpenSeatingManagementModalEvent> {
  map(event: OpenSeatingManagementModalEvent): MixpanelEvent {
    return new MixpanelEvent('open_seating_management_modal', event.data);
  }
}
