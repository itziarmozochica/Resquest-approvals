import { TrackingEvent } from '../../tracking-event';
import { TrackingMapper } from '../../tracking-mapper';
import { MixpanelEvent } from './mixpanel-event';

export interface MixpanelTrackingMapper<T extends TrackingEvent<any>> extends TrackingMapper<T, MixpanelEvent> {}
