import { TrackingEvent } from '../../tracking-event';
import { TrackingEvents } from '../tracking-events';

export interface DownloadOrdersData {
  purchased_at_from: string | null;
  purchased_at_to: string | null;
  channel: string | null;
  city_id: number | null;
  city_name: string | null;
  file_type: string;
  order_id: number | null;
  full_name: string | null;
}

export class DownloadOrdersEvent extends TrackingEvent<DownloadOrdersData> {
  constructor(readonly data: DownloadOrdersData) {
    super(TrackingEvents.DownloadOrders, data);
  }
}
