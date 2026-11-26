import { CancellationHoursError, CancellationSettingsFormControls } from './cancellation-settings-section.types';

export const CANCELLATION_HOURS_MAX = 8760;

export const CANCELLATION_HOURS_MIN = 0;

export const CANCELLATION_SETTINGS_CONTROL_NAMES: readonly (keyof CancellationSettingsFormControls)[] = [
  'allowTicketCancellations',
  'hoursBeforeSessionCancellationNotAllowed',
];

export const CANCELLATION_HOURS_ERRORS_BY_PRIORITY: readonly CancellationHoursError[] = ['hoursRequired', 'hoursInteger', 'hoursRange'];

export const CANCELLATION_HOURS_ERROR_MESSAGE_KEYS: Readonly<Record<CancellationHoursError, string>> = {
  hoursInteger: 'eventSettings.cancellations.errors.hoursInteger',
  hoursRange: 'eventSettings.cancellations.errors.hoursRange',
  hoursRequired: 'eventSettings.cancellations.errors.hoursRequired',
};
