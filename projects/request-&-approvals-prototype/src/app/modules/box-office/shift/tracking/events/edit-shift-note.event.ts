import { defineEvent } from '@fz/fz-tracking/src/public-api';

import { AddShiftNoteData } from './add-shift-note.event';

export type EditShiftNoteData = AddShiftNoteData;

export const editShiftNote = defineEvent<EditShiftNoteData>('click.editShiftNote');
