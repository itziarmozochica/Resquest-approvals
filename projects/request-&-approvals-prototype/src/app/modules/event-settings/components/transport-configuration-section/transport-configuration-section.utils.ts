import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

import { TransportConfigurationFormValue } from './transport-configuration-section.types';

export function isTransportConfigurationFormComplete(value: TransportConfigurationFormValue | null): boolean {
  if (value == null) {
    return false;
  }

  return (
    value.externalEventId.trim().length > 0 &&
    value.transportProviderId != null &&
    Number.isInteger(value.transportProviderId) &&
    value.transportProviderId > 0
  );
}

export function transportConfigurationRequiredWhenEnabledValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = control.value as TransportConfigurationFormValue | null;
    if (value == null || !value.enabled) {
      return null;
    }

    return isTransportConfigurationFormComplete(value) ? null : { transportConfigurationIncomplete: true };
  };
}
