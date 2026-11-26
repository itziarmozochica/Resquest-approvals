import { ConfirmStopRestartSessionEvent } from '../../core/events/confirm-stop-restart-sales';
import { MixpanelEvent } from '../../providers/mixpanel/mixpanel-event';
import { MixpanelTrackingMapper } from '../../providers/mixpanel/mixpanel-mapper';

export class ConfirmStopRestartSessionMapper implements MixpanelTrackingMapper<ConfirmStopRestartSessionEvent> {
  map(event: ConfirmStopRestartSessionEvent): MixpanelEvent {
    return new MixpanelEvent('confirm_stop_restart_session', event.data);
  }
}
