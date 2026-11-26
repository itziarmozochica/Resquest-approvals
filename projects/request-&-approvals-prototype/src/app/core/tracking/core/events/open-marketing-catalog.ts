import { TrackingEvent } from '../../tracking-event';
import { TrackingEvents } from '../tracking-events';

export class OpenMarketingCatalogEvent extends TrackingEvent<void> {
  constructor() {
    super(TrackingEvents.OpenMarketingCatalog);
  }
}
