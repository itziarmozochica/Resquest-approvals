import { SendWalletPassesEvent } from '../../core/events/send-wallet-passes';
import { MixpanelEvent } from '../../providers/mixpanel/mixpanel-event';
import { MixpanelTrackingMapper } from '../../providers/mixpanel/mixpanel-mapper';

export class SendWalletPassesMapper implements MixpanelTrackingMapper<SendWalletPassesEvent> {
  map(event: SendWalletPassesEvent): MixpanelEvent {
    return new MixpanelEvent('send_wallet_passes', event.data);
  }
}
