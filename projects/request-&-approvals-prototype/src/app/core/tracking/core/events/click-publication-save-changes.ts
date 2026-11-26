import { TrackingEvent } from '../../tracking-event';
import { TrackingEvents } from '../tracking-events';

export interface ClickPublicationSaveChangesData {
  plan_id: number;
  published_channel_ids: string[];
  visible_channel_ids: string[];
  unpublished_channel_ids: string[];
}

export class ClickPublicationSaveChangesEvent extends TrackingEvent<ClickPublicationSaveChangesData> {
  constructor(readonly data: ClickPublicationSaveChangesData) {
    super(TrackingEvents.ClickPublicationSaveChanges, data);
  }
}
