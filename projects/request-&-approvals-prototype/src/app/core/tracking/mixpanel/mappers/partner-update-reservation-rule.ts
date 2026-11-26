import { PartnerUpdateReservationRuleEvent } from '@fz-original/app/core/tracking/core/events/partner-update-reservation-rule';

import { MixpanelEvent } from '../../providers/mixpanel/mixpanel-event';
import { MixpanelTrackingMapper } from '../../providers/mixpanel/mixpanel-mapper';

export class PartnerUpdateReservationRuleMapper implements MixpanelTrackingMapper<PartnerUpdateReservationRuleEvent> {
  map(event: PartnerUpdateReservationRuleEvent): MixpanelEvent {
    return new MixpanelEvent('FZ|Reservation Rule|Update', event.data);
  }
}
