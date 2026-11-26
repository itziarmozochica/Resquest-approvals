import { LoadAmbassadorProgramDetailEvent } from '../../core/events/load-ambassador-program-detail';
import { MixpanelEvent } from '../../providers/mixpanel/mixpanel-event';
import { MixpanelTrackingMapper } from '../../providers/mixpanel/mixpanel-mapper';

export class LoadAmbassadorProgramDetailMapper implements MixpanelTrackingMapper<LoadAmbassadorProgramDetailEvent> {
  map(event: LoadAmbassadorProgramDetailEvent): MixpanelEvent {
    return new MixpanelEvent('FZ|Ambassador|ProgramDetail', event.data);
  }
}
