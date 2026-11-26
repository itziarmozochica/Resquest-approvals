import { ErrorAmbassadorRegisterFormEvent } from '../../core/events/error-ambassador-register-form';
import { MixpanelEvent } from '../../providers/mixpanel/mixpanel-event';
import { MixpanelTrackingMapper } from '../../providers/mixpanel/mixpanel-mapper';

export class ErrorAmbassadorRegisterFormMapper implements MixpanelTrackingMapper<ErrorAmbassadorRegisterFormEvent> {
  map(event: ErrorAmbassadorRegisterFormEvent): MixpanelEvent {
    return new MixpanelEvent('error_ambassador_register_form', event.data);
  }
}
