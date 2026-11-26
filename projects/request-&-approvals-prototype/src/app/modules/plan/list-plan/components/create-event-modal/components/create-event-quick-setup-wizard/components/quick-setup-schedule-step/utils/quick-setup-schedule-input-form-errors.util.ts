import { IngtFormError } from '@ignite/legacy/models/ignt-input.model';
import { TranslateService } from '@ngx-translate/core';

import { QUICK_SETUP_SCHEDULE_ERRORS_TRANSLATION_PREFIX } from './quick-setup-schedule-form-errors.util';

const QUICK_SETUP_SCHEDULE_MIN_VALUE = 1;

const translateScheduleInputError = (
  translateService: TranslateService,
  suffix: string,
  params?: Record<string, string | number>,
): string => translateService.instant(`${QUICK_SETUP_SCHEDULE_ERRORS_TRANSLATION_PREFIX}.${suffix}`, params);

export const buildQuickSetupSpecificDateInputFormErrors = (translateService: TranslateService): IngtFormError[] => [
  { message: translateScheduleInputError(translateService, 'dateRequired'), type: 'required' },
  { message: translateScheduleInputError(translateService, 'dateNotBeforeToday'), type: 'dateNotBeforeToday' },
  { message: translateScheduleInputError(translateService, 'dateNotWithinMaxRange'), type: 'dateNotWithinMaxRange' },
  { message: translateScheduleInputError(translateService, 'duplicateSpecificDate'), type: 'duplicateSpecificDate' },
];

export const buildQuickSetupStartDateInputFormErrors = (translateService: TranslateService): IngtFormError[] => [
  { message: translateScheduleInputError(translateService, 'startDateRequired'), type: 'required' },
  { message: translateScheduleInputError(translateService, 'dateNotBeforeToday'), type: 'dateNotBeforeToday' },
];

export const translateQuickSetupScheduleOverlapError = (translateService: TranslateService, conflictRange: string): string =>
  translateScheduleInputError(translateService, 'overlappingDateRange', { conflictRange });

export const buildQuickSetupEndDateInputFormErrors = (translateService: TranslateService): IngtFormError[] => [
  { message: translateScheduleInputError(translateService, 'invalidDateRange'), type: 'invalidDateRange' },
  { message: translateScheduleInputError(translateService, 'endDateRequired'), type: 'required' },
  { message: translateScheduleInputError(translateService, 'dateNotWithinMaxRange'), type: 'dateNotWithinMaxRange' },
];

export const buildQuickSetupExcludedDateInputFormErrors = (translateService: TranslateService): IngtFormError[] => [
  { message: translateScheduleInputError(translateService, 'excludedDateConflictsWithDayException'), type: 'conflictsWithDayException' },
  { message: translateScheduleInputError(translateService, 'excludedDateOutOfRange'), type: 'outOfRange' },
  { message: translateScheduleInputError(translateService, 'excludedDateRequired'), type: 'required' },
];

export const buildQuickSetupExceptionDateInputFormErrors = (translateService: TranslateService): IngtFormError[] => [
  { message: translateScheduleInputError(translateService, 'exceptionDateConflictsWithExcludedDate'), type: 'conflictsWithExcludedDate' },
  { message: translateScheduleInputError(translateService, 'duplicateExceptionDate'), type: 'duplicateExceptionDate' },
  { message: translateScheduleInputError(translateService, 'exceptionDateOutOfRange'), type: 'outOfRange' },
  { message: translateScheduleInputError(translateService, 'exceptionDateRequired'), type: 'required' },
];

export const buildQuickSetupStartTimeInputFormErrors = (translateService: TranslateService): IngtFormError[] => [
  { message: translateScheduleInputError(translateService, 'duplicateStartTime'), type: 'duplicateStartTime' },
  { message: translateScheduleInputError(translateService, 'startTimeRequired'), type: 'required' },
];

export const buildQuickSetupEndTimeInputFormErrors = (translateService: TranslateService): IngtFormError[] => [
  { message: translateScheduleInputError(translateService, 'inconsistentDuration'), type: 'inconsistentDuration' },
  { message: translateScheduleInputError(translateService, 'invalidTimeRange'), type: 'invalidTimeRange' },
  { message: translateScheduleInputError(translateService, 'endTimeRequired'), type: 'required' },
];

export const buildQuickSetupFirstTimeInputFormErrors = (translateService: TranslateService): IngtFormError[] => [
  { message: translateScheduleInputError(translateService, 'rangesOutOfOrder'), type: 'rangesOutOfOrder' },
  { message: translateScheduleInputError(translateService, 'firstTimeRequired'), type: 'required' },
];

export const buildQuickSetupLastTimeInputFormErrors = (translateService: TranslateService): IngtFormError[] => [
  { message: translateScheduleInputError(translateService, 'invalidTimeRange'), type: 'invalidTimeRange' },
  { message: translateScheduleInputError(translateService, 'lastTimeRequired'), type: 'required' },
];

export const buildQuickSetupRepeatsEveryInputFormErrors = (translateService: TranslateService): IngtFormError[] => [
  {
    message: translateScheduleInputError(translateService, 'repeatsEveryMin', { min: QUICK_SETUP_SCHEDULE_MIN_VALUE }),
    type: 'min',
  },
  { message: translateScheduleInputError(translateService, 'repeatsEveryRequired'), type: 'required' },
];

export const buildQuickSetupDurationInputFormErrors = (translateService: TranslateService): IngtFormError[] => [
  {
    message: translateScheduleInputError(translateService, 'durationMin', { min: QUICK_SETUP_SCHEDULE_MIN_VALUE }),
    type: 'min',
  },
  { message: translateScheduleInputError(translateService, 'durationRequired'), type: 'required' },
];

export const buildQuickSetupSalesDateTimeInputFormErrors = (translateService: TranslateService): IngtFormError[] => [
  { message: translateScheduleInputError(translateService, 'salesDateTimeRequired'), type: 'required' },
  { message: translateScheduleInputError(translateService, 'dateNotBeforeToday'), type: 'dateNotBeforeToday' },
];

export const buildQuickSetupSalesDeltaInputFormErrors = (translateService: TranslateService): IngtFormError[] => [
  { message: translateScheduleInputError(translateService, 'salesDeltaMin'), type: 'min' },
  { message: translateScheduleInputError(translateService, 'salesDeltaRequired'), type: 'required' },
];
