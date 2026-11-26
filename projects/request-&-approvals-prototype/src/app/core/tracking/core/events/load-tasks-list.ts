import { TrackingEvent } from '../../tracking-event';
import { TrackingEvents } from '../tracking-events';

export interface LoadTasksListData {
  city_id: number;
  plan_id: number;
  filtering_not_finished_tasks: boolean;
  page: number;
  page_size: number;
  from_date: string | undefined;
  to_date: string | undefined;
  search_term: string;
  order_by: Record<string, string>;
}

export class LoadTasksListEvent extends TrackingEvent<LoadTasksListData> {
  constructor(readonly data: LoadTasksListData) {
    super(TrackingEvents.LoadTasksList, data);
  }
}
