import { AbstractControl, FormGroup } from '@angular/forms';

import { CANCELLATION_SETTINGS_CONTROL_NAMES } from '@fz-original/app/modules/event-settings/components/cancellation-settings-section/cancellation-settings-section.constants';
import type {
  CancellationSettingsFormControls,
  CancellationSettingsFormValue,
} from '@fz-original/app/modules/event-settings/components/cancellation-settings-section/cancellation-settings-section.types';
import { MainPlanSettings } from '@fz-original/app/modules/event-settings/models/main-plan-settings.model';
import { CancellationSettingsSectionConfig } from '@fz-original/app/modules/event-settings/models/settings-configs.model';

export type CancellationSettingsPayload = Pick<
  Partial<MainPlanSettings>,
  'allowTicketCancellations' | 'hoursBeforeSessionCancellationNotAllowed'
>;

export function buildCancellationSettingsPayload(
  savedValue: CancellationSettingsFormValue,
  currentValue: CancellationSettingsFormValue,
): CancellationSettingsPayload {
  const payload: CancellationSettingsPayload = {};
  const currentHours = currentValue.hoursBeforeSessionCancellationNotAllowed;

  if (currentValue.allowTicketCancellations !== savedValue.allowTicketCancellations) {
    payload.allowTicketCancellations = currentValue.allowTicketCancellations;
  }
  if (
    currentValue.allowTicketCancellations === true &&
    currentHours !== null &&
    currentHours !== savedValue.hoursBeforeSessionCancellationNotAllowed
  ) {
    payload.hoursBeforeSessionCancellationNotAllowed = currentHours;
  }

  return payload;
}

export function applyCancellationSettingsPayload(
  savedValue: CancellationSettingsFormValue,
  payload: CancellationSettingsPayload,
): CancellationSettingsFormValue {
  return {
    allowTicketCancellations: payload.allowTicketCancellations ?? savedValue.allowTicketCancellations,
    hoursBeforeSessionCancellationNotAllowed:
      payload.hoursBeforeSessionCancellationNotAllowed ?? savedValue.hoursBeforeSessionCancellationNotAllowed,
  };
}

export function hasCancellationSettingsChanges(payload: CancellationSettingsPayload): boolean {
  return payload.allowTicketCancellations !== undefined || payload.hoursBeforeSessionCancellationNotAllowed !== undefined;
}

export function getUneditableCancellationControlNames(
  config: CancellationSettingsSectionConfig | null,
): readonly (keyof CancellationSettingsFormControls)[] {
  return CANCELLATION_SETTINGS_CONTROL_NAMES.filter(
    (name: keyof CancellationSettingsFormControls) => config === null || config[name].editable === false,
  );
}

export function isFormValidIgnoringUneditableCancellationControls(
  form: FormGroup,
  config: CancellationSettingsSectionConfig | null,
): boolean {
  if (form.valid) {
    return true;
  }
  if (form.disabled) {
    return false;
  }
  const uneditableControlNames: readonly string[] = getUneditableCancellationControlNames(config);
  return Object.entries(form.controls).every(
    ([name, control]: [string, AbstractControl]) => uneditableControlNames.includes(name) || control.valid || control.disabled,
  );
}
