import { ValidatorFn } from '@angular/forms';
import { Params } from '@angular/router';

import { BusinessValidationOptionTypeahead, ValidationOptionTypeahead } from '../enums/validation-option-typeahead.enum';
import { ValidationTypeEnum } from '../enums/validation-type.enum';

export interface ValidationSearchType<T> {
  readonly inputPlaceholder: string;
  readonly typeaheadEnumValue: ValidationOptionTypeahead | BusinessValidationOptionTypeahead;
  readonly validationOptionEnumValue: ValidationTypeEnum;
  readonly validators: ValidatorFn | ValidatorFn[];
  toQueryParam(value: T): { [key: string]: T };
  fromQueryParam(params: Params): T;
}

export interface ValidationSearchOptionRequest {
  type: ValidationTypeEnum;
  value: string | number;
  fromCamera: boolean;
  fromScan: boolean;
  scanOrigin?: string;
}
