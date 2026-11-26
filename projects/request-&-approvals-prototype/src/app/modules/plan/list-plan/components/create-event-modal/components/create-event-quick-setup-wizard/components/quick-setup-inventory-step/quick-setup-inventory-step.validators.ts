import { AbstractControl, FormArray, ValidationErrors, ValidatorFn } from '@angular/forms';

import { SessionTypeSelectionRule } from '@fz-original/app/shared/services/sessions/session-type.model';

export function neededSessionTypeValidator(getAvailableNames: (control: AbstractControl) => string[]): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const selectionRule = control.get('selectionRule')?.value;

    if (selectionRule !== SessionTypeSelectionRule.needsSessionType) {
      return null;
    }

    const neededSessionTypes: unknown = control.get('neededSessionTypes')?.value;
    const neededSessionTypeNames = Array.isArray(neededSessionTypes)
      ? neededSessionTypes.map(name => String(name).trim()).filter(name => name.length > 0)
      : [];

    if (neededSessionTypeNames.length === 0) {
      return { neededSessionTypeRequired: true };
    }

    const availableNames = getAvailableNames(control);

    if (!neededSessionTypeNames.every(name => availableNames.includes(name))) {
      return { neededSessionTypeRequired: true };
    }

    return null;
  };
}

export function uniqueNameValidator(getSiblingNames: (control: AbstractControl) => string[]): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const name = normalizeName(control.value);

    if (name.length === 0) {
      return null;
    }

    return getSiblingNames(control).some(siblingName => normalizeName(siblingName) === name) ? { nameDuplicated: true } : null;
  };
}

function normalizeName(value: unknown): string {
  return typeof value === 'string' ? value.trim().toLocaleLowerCase() : '';
}

export function groupHasTicketsValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const tickets = control.get('tickets');

    return tickets instanceof FormArray && tickets.length === 0 ? { groupWithoutTickets: true } : null;
  };
}

export function ticketsAllowedRangeValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const min = control.get('minToSell')?.value;
    const max = control.get('maxToSell')?.value;

    if (min == null && max == null) {
      return null;
    }

    if (min == null || max == null) {
      return { ticketsAllowedIncomplete: true };
    }

    if (Number(min) < 1 || Number(max) < Number(min)) {
      return { ticketsAllowedRange: true };
    }

    return null;
  };
}

export function tierPricesValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const filledTierPrices = ['valleyPrice', 'normalPrice', 'peakPrice'].filter(fieldName =>
      isTierPriceFilled(control.get(fieldName)?.value),
    );

    return filledTierPrices.length >= 2 ? null : { tierPricesInsufficient: true };
  };
}

export function isTierPriceFilled(value: unknown): boolean {
  return value != null && value !== '' && !Number.isNaN(Number(value));
}
