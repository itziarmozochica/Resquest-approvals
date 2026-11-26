import { LoadMyAmbassadorProgramsEvent } from '../../core/events/load-my-ambassador-programs';
import { MixpanelEvent } from '../../providers/mixpanel/mixpanel-event';
import { MixpanelTrackingMapper } from '../../providers/mixpanel/mixpanel-mapper';

export class LoadMyAmbassadorProgramsMapper implements MixpanelTrackingMapper<LoadMyAmbassadorProgramsEvent> {
  map(event: LoadMyAmbassadorProgramsEvent): MixpanelEvent {
    return new MixpanelEvent('FZ|Ambassador|MyProgramsList', event.data);
  }
}
