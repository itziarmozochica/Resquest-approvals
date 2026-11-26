import { AbstractControl, FormGroup } from '@angular/forms';

export interface QuickSetupScheduleFormErrorViewModel {
  id: string;
  translationKey: string;
  translationParams?: Record<string, string | number>;
}

export const QUICK_SETUP_SCHEDULE_ERRORS_TRANSLATION_PREFIX = 'createEvent.quickSetupWizard.step3.errors';

export const WEEKDAYS_REQUIRED_ERROR_TRANSLATION_KEY = `${QUICK_SETUP_SCHEDULE_ERRORS_TRANSLATION_PREFIX}.weekdaysRequired`;
export const WEEKDAYS_NOT_IN_RANGE_ERROR_TRANSLATION_KEY = `${QUICK_SETUP_SCHEDULE_ERRORS_TRANSLATION_PREFIX}.weekdaysNotInRange`;
export const SESSION_TYPES_REQUIRED_ERROR_TRANSLATION_KEY = `${QUICK_SETUP_SCHEDULE_ERRORS_TRANSLATION_PREFIX}.sessionTypesRequired`;
export const EXCEPTION_SESSION_TYPES_REQUIRED_ERROR_TRANSLATION_KEY = `${QUICK_SETUP_SCHEDULE_ERRORS_TRANSLATION_PREFIX}.exceptionSessionTypesRequired`;

const shouldShowWeekdayFormLevelError = (form: FormGroup, errorName: string): boolean => {
  if (!form.errors?.[errorName]) {
    return false;
  }

  const selectedWeekdaysControl = form.get('selectedWeekdays');

  return form.touched || !!selectedWeekdaysControl?.touched || !!selectedWeekdaysControl?.dirty;
};

export const shouldShowWeekdaysRequiredError = (form: FormGroup): boolean => shouldShowWeekdayFormLevelError(form, 'weekdaysRequired');

export const shouldShowWeekdaysNotInRangeError = (form: FormGroup): boolean => shouldShowWeekdayFormLevelError(form, 'weekdaysNotInRange');

export const shouldShowSessionTypesRequiredError = (form: FormGroup): boolean => {
  const control = form.get('selectedSessionTypeIds');

  return shouldShowControlError(control) && !!control?.errors?.required;
};

const shouldShowControlError = (control: AbstractControl | null | undefined): control is AbstractControl =>
  !!control && !control.disabled && control.invalid && (control.touched || control.dirty);
