import { LoadResellerAmbassadorProgramListEvent } from '../../core/events/load-reseller-ambassador-program-list';
import { MixpanelEvent } from '../../providers/mixpanel/mixpanel-event';
import { MixpanelTrackingMapper } from '../../providers/mixpanel/mixpanel-mapper';

export class LoadResellerAmbassadorProgramListMapper implements MixpanelTrackingMapper<LoadResellerAmbassadorProgramListEvent> {
  map(event: LoadResellerAmbassadorProgramListEvent): MixpanelEvent {
    return new MixpanelEvent('load_reseller_ambassador_program_list', event.data);
  }
}
