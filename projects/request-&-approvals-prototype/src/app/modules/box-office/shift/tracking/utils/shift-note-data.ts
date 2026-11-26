import { Money } from '../../../../../shared/models/money.model';
import { Shift, ShiftStatus } from '../../../shared/models/shifts.model';
import { AddShiftNoteData } from '../events/add-shift-note.event';

/** The payload both shift-note events send. The cash difference only exists once the shift is closed. */
export function buildShiftNoteData(shift: Shift, notes: string, getLeftOver: () => Money | null): AddShiftNoteData {
  return {
    cashDifference: shift.status !== ShiftStatus.opened ? getLeftOver()?.amount || 0 : undefined,
    cashierEmail: shift.b2bUser.b2bUserEmail,
    cashierName: shift.b2bUser.b2bUserName,
    endDate: shift.closedAt?.toISOString(),
    notes,
    startDate: shift.createdAt?.toISOString(),
    status: shift.status,
    venueId: shift.oboVenueId,
    venueName: shift.oboVenueName,
  };
}
