import { mixpanelMapper } from '@fz/fz-tracking/src/public-api';

import { addShiftNote } from './events/add-shift-note.event';
import { editShiftNote } from './events/edit-shift-note.event';

export const shiftMixpanelMappers = mixpanelMapper([
  {
    event: addShiftNote,
    name: 'add_shift_note',
    properties: null, // the legacy wire sent these camelCase keys as they are
  },
  {
    event: editShiftNote,
    name: 'edit_shift_note',
    properties: null,
  },
]);
