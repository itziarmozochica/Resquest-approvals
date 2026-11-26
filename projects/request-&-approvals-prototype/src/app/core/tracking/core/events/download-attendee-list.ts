import { ListPlanItem } from '../../../../modules/attendees/list-attendees/models/list-plan-item.model';
import { TrackingEvent } from '../../tracking-event';
import { TrackingEvents } from '../tracking-events';

export interface DownloadAttendeeListData {
  plan: ListPlanItem;
  download_type: string;
  file_type: string;
  grouped_by: string;
  starts_at_from: string;
  starts_at_to: string;
}

export class DownloadAttendeeListEvent extends TrackingEvent<DownloadAttendeeListData> {
  constructor(readonly data: DownloadAttendeeListData) {
    super(TrackingEvents.DownloadAttenddeList, data);
  }
}
