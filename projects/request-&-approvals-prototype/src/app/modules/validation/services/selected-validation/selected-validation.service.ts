import { Injectable } from '@angular/core';

import { ValidationOptionTypeahead } from '../../enums/validation-option-typeahead.enum';

@Injectable({
  providedIn: 'root',
})
export class SelectedValidationService {
  private partnerValidationMap = new Map<number, ValidationOptionTypeahead>();

  getValidationOption(partnerId: number | null): ValidationOptionTypeahead | undefined {
    if (partnerId === null) {
      return undefined;
    }
    return this.partnerValidationMap.get(partnerId);
  }

  setValidationOption(partnerId: number, validationOptionId: ValidationOptionTypeahead): void {
    this.partnerValidationMap = this.partnerValidationMap.set(partnerId, validationOptionId);
  }
}
