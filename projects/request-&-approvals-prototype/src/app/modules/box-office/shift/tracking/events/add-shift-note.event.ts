import { defineEvent } from '@fz/fz-tracking/src/public-api';

export interface AddShiftNoteData {
  cashierEmail: string;
  cashierName: string;
  notes: string;
  startDate: string;
  status: string;
  venueId: number;
  venueName: string;
  cashDifference?: number;
  endDate?: string;
}

export const addShiftNote = defineEvent<AddShiftNoteData>('click.addShiftNote');
