import { TrackingEvent } from '../../tracking-event';
import { TrackingEvents } from '../tracking-events';

export interface UpdatePublishedSessionTypesInChannelData {
  plan_id: number;
  channel_id: string;
  unpublished_session_type_ids: Array<number>;
  published_session_type_ids: Array<number>;
}

export class UpdatePublishedSessionTypesInChannelEvent extends TrackingEvent<UpdatePublishedSessionTypesInChannelData> {
  constructor(readonly data: UpdatePublishedSessionTypesInChannelData) {
    super(TrackingEvents.UpdatePublishedSessionTypesInChannel, data);
  }
}
