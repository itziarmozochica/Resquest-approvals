import { PartnerCreateReservationRuleEvent } from '@fz-original/app/core/tracking/core/events/partner-create-reservation-rule';

import { MixpanelEvent } from '../../providers/mixpanel/mixpanel-event';
import { MixpanelTrackingMapper } from '../../providers/mixpanel/mixpanel-mapper';

export class PartnerCreateReservationRuleMapper implements MixpanelTrackingMapper<PartnerCreateReservationRuleEvent> {
  map(event: PartnerCreateReservationRuleEvent): MixpanelEvent {
    return new MixpanelEvent('FZ|Reservation Rule|Create', event.data);
  }
}
