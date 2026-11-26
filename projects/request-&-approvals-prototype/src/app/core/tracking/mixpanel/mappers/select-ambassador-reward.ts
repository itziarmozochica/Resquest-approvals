import { SelectAmbassadorRewardEvent } from '../../core/events/select-ambassador-reward';
import { MixpanelEvent } from '../../providers/mixpanel/mixpanel-event';
import { MixpanelTrackingMapper } from '../../providers/mixpanel/mixpanel-mapper';

export class SelectAmbassadorRewardMapper implements MixpanelTrackingMapper<SelectAmbassadorRewardEvent> {
  map(event: SelectAmbassadorRewardEvent): MixpanelEvent {
    return new MixpanelEvent('FZ|Ambassador|SelectReward', event.data);
  }
}
