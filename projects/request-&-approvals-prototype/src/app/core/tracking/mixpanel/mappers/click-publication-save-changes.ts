import { ClickPublicationSaveChangesEvent } from '../../core/events/click-publication-save-changes';
import { MixpanelEvent } from '../../providers/mixpanel/mixpanel-event';
import { MixpanelTrackingMapper } from '../../providers/mixpanel/mixpanel-mapper';

export class ClickPublicationSaveChangesMapper implements MixpanelTrackingMapper<ClickPublicationSaveChangesEvent> {
  map(event: ClickPublicationSaveChangesEvent): MixpanelEvent {
    return new MixpanelEvent('click_publication_save_changes', event.data);
  }
}
