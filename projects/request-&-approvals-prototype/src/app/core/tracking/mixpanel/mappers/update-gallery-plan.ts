import { UpdateGalleryPlanEvent } from '../../core/events/update-gallery-plan';
import { MixpanelEvent } from '../../providers/mixpanel/mixpanel-event';
import { MixpanelTrackingMapper } from '../../providers/mixpanel/mixpanel-mapper';

export class UpdateGalleryPlanMapper implements MixpanelTrackingMapper<UpdateGalleryPlanEvent> {
  map(event: UpdateGalleryPlanEvent): MixpanelEvent {
    return new MixpanelEvent('update_gallery_plan', event.data);
  }
}
