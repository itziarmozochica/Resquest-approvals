import { BulkEdit } from '@fz-original/app/modules/sessions/sessions-bulk-edit/services/bulk-edit/bulk-edit.model';

import { TrackingEvent } from '../../tracking-event';
import { TrackingEvents } from '../tracking-events';

type SaveBulkEditData = {
  plan_id: number;
  place_id: number;
  plan_name: string;
} & Partial<BulkEdit>;

export class SaveBulkEditEvent extends TrackingEvent<SaveBulkEditData> {
  constructor(readonly data: SaveBulkEditData) {
    super(TrackingEvents.SaveBulkEdit, data);
  }
}
