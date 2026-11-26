import { ListPlanItem } from '../../../../modules/attendees/list-attendees/models/list-plan-item.model';
import { TrackingEvent } from '../../tracking-event';
import { TrackingEvents } from '../tracking-events';

export interface DownloadCodeListData {
  plan: ListPlanItem;
  place_id: number;
  file_type: string;
  starts_at_from: string;
  starts_at_to: string;
}

export class DownloadCodeListEvent extends TrackingEvent<DownloadCodeListData> {
  constructor(readonly data: DownloadCodeListData) {
    super(TrackingEvents.DownloadCodeList, data);
  }
}
