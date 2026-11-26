import { SelectOptionTypeaheadEvent } from '../../core/events/select-option-typeahead';
import { MixpanelEvent } from '../../providers/mixpanel/mixpanel-event';
import { MixpanelTrackingMapper } from '../../providers/mixpanel/mixpanel-mapper';

export class SelectOptionTypeaheadMapper implements MixpanelTrackingMapper<SelectOptionTypeaheadEvent> {
  map(event: SelectOptionTypeaheadEvent): MixpanelEvent {
    return new MixpanelEvent('select_option_typeahead', event.data);
  }
}
