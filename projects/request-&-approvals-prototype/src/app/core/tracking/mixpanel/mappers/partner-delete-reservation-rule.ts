import { PartnerDeleteReservationRuleEvent } from '@fz-original/app/core/tracking/core/events/partner-delete-reservation-rule';

import { MixpanelEvent } from '../../providers/mixpanel/mixpanel-event';
import { MixpanelTrackingMapper } from '../../providers/mixpanel/mixpanel-mapper';

export class PartnerDeleteReservationRuleMapper implements MixpanelTrackingMapper<PartnerDeleteReservationRuleEvent> {
  map(event: PartnerDeleteReservationRuleEvent): MixpanelEvent {
    return new MixpanelEvent('FZ|Reservation Rule|Delete', event.data);
  }
}
