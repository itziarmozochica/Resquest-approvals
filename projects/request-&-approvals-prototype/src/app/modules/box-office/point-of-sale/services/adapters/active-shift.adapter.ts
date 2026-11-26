import { ActiveShift } from '@fz-original/app/modules/box-office/ticketing/components/start-end-shift/start-end-shift.component';

import { ShiftStatus, type Shift } from '../../../shared/models/shifts.model';

/** Extra context the shift domain model does not carry — resolved by the shift widget component and passed in by the caller. */
export interface ActiveShiftContext {
  cashRegisterName?: string;
  timezone?: string | null;
}

/**
 * `Shift` (API domain model) to `ActiveShift` (the shape the ticketing surface consumes).
 *
 * Parity-locked: currency and cash-register id come from the single *opened* cash register; the
 * timezone and human cash-register name are not on the shift payload — `OssShiftWidgetComponent`
 * resolves them, so callers must pass them in via `context`.
 */
export const toActiveShift = (shift: Shift | null, context: ActiveShiftContext = {}): ActiveShift | null => {
  if (!shift) {
    return null;
  }
  const openedCashRegister = shift.cashRegisters?.find(cashRegister => cashRegister.status === ShiftStatus.opened);

  return {
    cashierUserName: shift.b2bUser.b2bUserUsername,
    cashRegister: openedCashRegister?.cashRegisterId ?? '',
    cashRegisterName: context.cashRegisterName ?? '',
    complianceCheckoutEnabled: shift.complianceCheckoutEnabled,
    currency: openedCashRegister?.currency ?? '',
    id: shift.id,
    initialAmount: openedCashRegister?.initialAmount,
    oboVenueId: shift.oboVenueId,
    onsiteSetupId: shift.onsiteSetupId ?? '',
    startTime: shift.createdAt.toISOString(),
    timezone: context.timezone ?? '',
  };
};
