import { LoadTasksListEvent } from '../../core/events/load-tasks-list';
import { MixpanelEvent } from '../../providers/mixpanel/mixpanel-event';
import { MixpanelTrackingMapper } from '../../providers/mixpanel/mixpanel-mapper';

export class LoadTasksListMapper implements MixpanelTrackingMapper<LoadTasksListEvent> {
  map(event: LoadTasksListEvent): MixpanelEvent {
    return new MixpanelEvent('FZ|Tasks|List', event.data);
  }
}
