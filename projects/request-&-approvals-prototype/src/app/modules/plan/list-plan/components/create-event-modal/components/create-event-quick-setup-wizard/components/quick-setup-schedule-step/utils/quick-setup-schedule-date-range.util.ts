import { AbstractControl, FormArray, FormGroup, ValidationErrors, ValidatorFn } from '@angular/forms';

import {
  findDateContainedInAnotherRange,
  findOverlappingDateRange,
  formatDateRangeConflict,
  resolveDateRangeBounds,
  sortDateRanges,
} from '@fz-original/app/modules/inventory/inventory-schedule/utils/schedule-calendar-date-range.util';
import {
  QuickSetupDateRangesFormArray,
  QuickSetupRecurrentDateRangeRow,
} from '@fz-original/app/modules/plan/list-plan/components/create-event-modal/models/quick-setup-schedule.model';

import { isDateWithinRange } from './quick-setup-schedule.util';

export function resolveFilledQuickSetupDateRanges(
  dateRanges: readonly QuickSetupRecurrentDateRangeRow[] | null | undefined,
): QuickSetupRecurrentDateRangeRow[] {
  return (dateRanges ?? []).filter(range => range.startDate && range.endDate && range.endDate >= range.startDate);
}

export function resolveQuickSetupDateRangeEnvelope(
  dateRanges: readonly QuickSetupRecurrentDateRangeRow[],
): QuickSetupRecurrentDateRangeRow {
  const filled = sortDateRanges(resolveFilledQuickSetupDateRanges(dateRanges));
  const [firstRange] = filled;
  const lastRange = filled.at(-1);

  if (!firstRange || !lastRange) {
    return { endDate: '', startDate: '' };
  }

  return { endDate: lastRange.endDate, startDate: firstRange.startDate };
}

export function isDateWithinAnyQuickSetupDateRange(date: string, dateRanges: readonly QuickSetupRecurrentDateRangeRow[]): boolean {
  return resolveFilledQuickSetupDateRanges(dateRanges).some(range => isDateWithinRange(date, range.startDate, range.endDate));
}

export function readQuickSetupDateRangesFromForm(form: FormGroup): QuickSetupRecurrentDateRangeRow[] {
  const dateRanges = form.get('dateRanges') as QuickSetupDateRangesFormArray | null; // the schedule item form builds dateRanges with createScheduleItemDateRangeRow rows only

  return dateRanges?.getRawValue() ?? [];
}

const isValidPlanDate = (value: string | null): value is string => !!value && !isNaN(new Date(value).getTime());

const toOverlapValidationError = (
  bounds: { endDate: string; startDate: string },
  translateOverlapError: (conflictRange: string) => string,
): ValidationErrors => {
  const conflictRange = formatDateRangeConflict(bounds);

  return { overlappingDateRange: { conflictRange, message: translateOverlapError(conflictRange) } };
};

export function createQuickSetupDateRangeOverlapValidator(translateOverlapError: (conflictRange: string) => string): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const dateRanges = control.parent?.parent;

    if (!(dateRanges instanceof FormArray)) {
      return null;
    }

    const rows = (dateRanges as QuickSetupDateRangesFormArray).controls;
    const row = rows.find(candidate => candidate.controls.endDate === control || candidate.controls.startDate === control);

    if (!row) {
      return null;
    }

    const isStartControl = row.controls.startDate === control;
    const { endDate, startDate } = row.getRawValue();
    const otherRowValues = rows.filter(otherRow => otherRow !== row).map(otherRow => otherRow.getRawValue());
    const otherRowBounds = otherRowValues
      .map(otherRow => resolveDateRangeBounds(otherRow))
      .filter((bounds): bounds is NonNullable<ReturnType<typeof resolveDateRangeBounds>> => bounds !== null);

    const startOverlapBounds = isValidPlanDate(startDate) ? findDateContainedInAnotherRange(startDate, otherRowValues) : null;
    const endOverlapBounds = isValidPlanDate(endDate) ? findDateContainedInAnotherRange(endDate, otherRowValues) : null;
    const hasInvalidRangeOrder = isValidPlanDate(startDate) && isValidPlanDate(endDate) && endDate < startDate;
    const currentBounds = !hasInvalidRangeOrder ? resolveDateRangeBounds({ endDate, startDate }) : null;
    const intervalOverlapBounds =
      currentBounds && !startOverlapBounds && !endOverlapBounds ? findOverlappingDateRange(currentBounds, otherRowBounds) : null;

    if (isStartControl) {
      return startOverlapBounds ? toOverlapValidationError(startOverlapBounds, translateOverlapError) : null;
    }

    const resolvedEndOverlapBounds = endOverlapBounds ?? intervalOverlapBounds;

    return resolvedEndOverlapBounds ? toOverlapValidationError(resolvedEndOverlapBounds, translateOverlapError) : null;
  };
}
