import { TrackingEvent } from '../../tracking-event';
import { TrackingEvents } from '../tracking-events';

export interface ClickPricePerChannelEventData {
  plan_id: number;
  session_id: number;
  channel_id: string;
}

export class ClickPricePerChannelEvent extends TrackingEvent<ClickPricePerChannelEventData> {
  constructor(readonly data: ClickPricePerChannelEventData) {
    super(TrackingEvents.ClickPricePerChannel, data);
  }
}
