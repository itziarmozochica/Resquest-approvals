import { TrackingEvent } from '../../tracking-event';
import { TrackingEvents } from '../tracking-events';

export interface SearchUsersData {
  input: string;
  status: string;
}

export class SearchUsersEvent extends TrackingEvent<SearchUsersData> {
  constructor(readonly data: SearchUsersData) {
    super(TrackingEvents.SearchUsers, data);
  }
}
