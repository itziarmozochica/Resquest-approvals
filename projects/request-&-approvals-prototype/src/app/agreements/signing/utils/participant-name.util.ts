import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

/** The Agreement Service stores a trimmed name of 1 to 100 characters. */
export const participantNameMaxLength = 100;

/** A whitespace-only name fails here instead of coming back from the Agreement Service as a generic rejection. */
export const nonBlankName: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  const trimmed = typeof control.value === 'string' ? control.value.trim() : '';
  if (trimmed.length === 0) {
    return { required: true };
  }
  return trimmed.length > participantNameMaxLength
    ? { maxlength: { actualLength: trimmed.length, requiredLength: participantNameMaxLength } }
    : null;
};
