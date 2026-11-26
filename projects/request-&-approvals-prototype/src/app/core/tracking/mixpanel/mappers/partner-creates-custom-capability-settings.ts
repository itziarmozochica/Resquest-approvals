import { PartnerCreatesCustomCapabilitySettingsEvent } from '@fz-original/app/core/tracking/core/events/partner-creates-custom-capability-settings';

import { MixpanelEvent } from '../../providers/mixpanel/mixpanel-event';
import { MixpanelTrackingMapper } from '../../providers/mixpanel/mixpanel-mapper';

export class PartnerCreatesCustomCapabilitySettings implements MixpanelTrackingMapper<PartnerCreatesCustomCapabilitySettingsEvent> {
  map(event: PartnerCreatesCustomCapabilitySettingsEvent): MixpanelEvent {
    return new MixpanelEvent('partner_creates_custom_capability_setting', event.data);
  }
}
