import { RedeemAmbassadorProgramRewardEvent } from '../../core/events/redeem-ambassador-program-reward';
import { MixpanelEvent } from '../../providers/mixpanel/mixpanel-event';
import { MixpanelTrackingMapper } from '../../providers/mixpanel/mixpanel-mapper';

export class RedeemAmbassadorProgramRewardMapper implements MixpanelTrackingMapper<RedeemAmbassadorProgramRewardEvent> {
  map(event: RedeemAmbassadorProgramRewardEvent): MixpanelEvent {
    return new MixpanelEvent('FZ|Ambassador|RedeemReward', event.data);
  }
}
