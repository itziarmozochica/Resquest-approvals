import { SuccessAmbassadorRegisterFormEvent } from '../../core/events/success-ambassador-register-form';
import { MixpanelEvent } from '../../providers/mixpanel/mixpanel-event';
import { MixpanelTrackingMapper } from '../../providers/mixpanel/mixpanel-mapper';

export class SuccessAmbassadorRegisterFormMapper implements MixpanelTrackingMapper<SuccessAmbassadorRegisterFormEvent> {
  map(event: SuccessAmbassadorRegisterFormEvent): MixpanelEvent {
    return new MixpanelEvent('success_ambassador_register_form', event.data);
  }
}
