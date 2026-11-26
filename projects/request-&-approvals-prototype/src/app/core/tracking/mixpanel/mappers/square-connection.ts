import { SquareConnectionEvent } from '../../core/events/square-connection';
import { MixpanelEvent } from '../../providers/mixpanel/mixpanel-event';
import { MixpanelTrackingMapper } from '../../providers/mixpanel/mixpanel-mapper';

export class SquareConnectionMapper implements MixpanelTrackingMapper<SquareConnectionEvent> {
  map(event: SquareConnectionEvent): MixpanelEvent {
    return new MixpanelEvent('square_connection', event.data);
  }
}
