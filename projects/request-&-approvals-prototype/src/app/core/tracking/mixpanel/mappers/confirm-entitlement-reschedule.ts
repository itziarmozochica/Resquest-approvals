import { ConfirmEntitlementRescheduleEvent } from '../../core/events/confirm-entitlement-reschedule';
import { MixpanelEvent } from '../../providers/mixpanel/mixpanel-event';
import { MixpanelTrackingMapper } from '../../providers/mixpanel/mixpanel-mapper';

export class ConfirmEntitlementRescheduleMapper implements MixpanelTrackingMapper<ConfirmEntitlementRescheduleEvent> {
  map(event: ConfirmEntitlementRescheduleEvent): MixpanelEvent {
    return new MixpanelEvent('confirm_entitlement_reschedule', event.data);
  }
}
