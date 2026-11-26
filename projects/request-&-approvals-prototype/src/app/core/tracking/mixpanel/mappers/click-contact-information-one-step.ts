import { ClickContactInformationOnStepEvent } from '../../core/events/click-contact-information-one-step';
import { MixpanelEvent } from '../../providers/mixpanel/mixpanel-event';
import { MixpanelTrackingMapper } from '../../providers/mixpanel/mixpanel-mapper';

export class ClickContactInformationOneStepMapper implements MixpanelTrackingMapper<ClickContactInformationOnStepEvent> {
  map(event: ClickContactInformationOnStepEvent): MixpanelEvent {
    return new MixpanelEvent('click_contact_information_on_step', event.data);
  }
}
