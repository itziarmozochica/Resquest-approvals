import { AbstractControl, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';

import { QuickSetupRecurrentDateRangeRow } from '@fz-original/app/modules/plan/list-plan/components/create-event-modal/models/quick-setup-schedule.model';

import { isDateWithinAnyQuickSetupDateRange, resolveFilledQuickSetupDateRanges } from '../../utils/quick-setup-schedule-date-range.util';

export interface QuickSetupDayExceptionValidationErrorDetail {
  dates: (ValidationErrors | null)[];
  selectedSessionTypeIds: ValidationErrors | null;
}

export const CARD_EXCEPTION_DETAIL_ERROR_KEY = 'cardExceptionDetail';

export const QUICK_SETUP_DAY_EXCEPTION_DETAILS_ERROR_KEY = 'dayExceptionDetails';

export interface QuickSetupDayExceptionValidationContext {
  dateRanges: QuickSetupRecurrentDateRangeRow[];
  excludedDates: string[];
}

export const createDayExceptionDateInRangeValidator = (context: QuickSetupDayExceptionValidationContext): ValidatorFn => {
  return (control: AbstractControl): ValidationErrors | null => {
    const date = control.value as string;

    if (!date) {
      return null;
    }

    if (resolveFilledQuickSetupDateRanges(context.dateRanges).length === 0) {
      return null;
    }

    return isDateWithinAnyQuickSetupDateRange(date, context.dateRanges) ? null : { outOfRange: true };
  };
};

export const createDayExceptionDateConflictsWithExcludedValidator = (context: QuickSetupDayExceptionValidationContext): ValidatorFn => {
  return (control: AbstractControl): ValidationErrors | null => {
    const date = control.value as string;

    if (!date) {
      return null;
    }

    return context.excludedDates.includes(date) ? { conflictsWithExcludedDate: true } : null;
  };
};

export const createDayExceptionDateDuplicateValidator = (collectDates: () => string[]): ValidatorFn => {
  return (control: AbstractControl): ValidationErrors | null => {
    if (control.disabled) {
      return null;
    }

    const date = control.value as string;

    if (!date) {
      return null;
    }

    const duplicateCount = collectDates().filter(exceptionDate => exceptionDate === date).length;

    return duplicateCount > 1 ? { duplicateExceptionDate: true } : null;
  };
};

export const createDayExceptionLocalDateValidators = (context: QuickSetupDayExceptionValidationContext): ValidatorFn[] => [
  Validators.required,
  createDayExceptionDateInRangeValidator(context),
  createDayExceptionDateConflictsWithExcludedValidator(context),
];

export const createDayExceptionDateValidators = (
  context: QuickSetupDayExceptionValidationContext,
  collectDates: () => string[],
): ValidatorFn[] => [...createDayExceptionLocalDateValidators(context), createDayExceptionDateDuplicateValidator(collectDates)];

export const mergeDayExceptionValidationDetailsFromValues = (
  cardDetails: QuickSetupDayExceptionValidationErrorDetail[],
  exceptionValues: { dates: string[] }[],
): QuickSetupDayExceptionValidationErrorDetail[] => {
  const allDates = exceptionValues.flatMap(exception => exception.dates.filter(Boolean));

  return cardDetails.map((detail, exceptionIndex) => ({
    dates: (exceptionValues[exceptionIndex]?.dates ?? []).map((date, dateIndex) =>
      mergeDuplicateDateError(detail.dates[dateIndex] ?? null, date, allDates),
    ),
    selectedSessionTypeIds: detail.selectedSessionTypeIds,
  }));
};

const mergeDuplicateDateError = (localErrors: ValidationErrors | null, date: string, allDates: string[]): ValidationErrors | null => {
  if (!date || allDates.filter(exceptionDate => exceptionDate === date).length <= 1) {
    return localErrors;
  }

  return { ...(localErrors ?? {}), duplicateExceptionDate: true };
};
