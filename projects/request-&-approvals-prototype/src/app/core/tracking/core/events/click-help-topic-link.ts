import { TrackingEvent } from '../../tracking-event';
import { TrackingEvents } from '../tracking-events';

export interface ClickHelpTopicLinkData {
  screen: string;
  link_out: string;
}

export class ClickHelpTopicLinkEvent extends TrackingEvent<ClickHelpTopicLinkData> {
  constructor(readonly data: ClickHelpTopicLinkData) {
    super(TrackingEvents.ClickHelpTopicLink, data);
  }
}
