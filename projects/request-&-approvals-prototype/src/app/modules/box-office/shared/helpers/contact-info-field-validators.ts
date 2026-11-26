import { ValidatorFn, Validators } from '@angular/forms';

import { emailValidator } from '@fz-original/app/shared/validators/email.validator';
import type { IngtFormError } from '@ignite/legacy/models/ignt-input.model';
import type { TranslateService } from '@ngx-translate/core';

import type { FieldName } from '../models/dual-screen-sync/contact-info-dual-screen-sync.model';

export const CONTACT_INFO_SYNC_NAME_MAX_LENGTH = 70 as const;

export interface ContactInfoSyncFieldConfig {
  readonly customFormErrors: IngtFormError[];
  readonly validators: ValidatorFn[];
}

const noopTranslate = { instant: (key: string): string => key } as TranslateService;

function getContactInfoFieldValidation(field: FieldName, translate: TranslateService): ContactInfoSyncFieldConfig {
  switch (field) {
    case 'email':
      return {
        customFormErrors: [
          {
            message: translate.instant('form.error.invalidEmail'),
            type: 'emailValidator',
          },
        ],
        validators: [emailValidator()],
      };
    case 'firstName':
    case 'lastName':
      return {
        customFormErrors: [
          {
            message: translate.instant('form.error.maxLength', { value: CONTACT_INFO_SYNC_NAME_MAX_LENGTH }),
            type: 'maxlength',
          },
        ],
        validators: [Validators.maxLength(CONTACT_INFO_SYNC_NAME_MAX_LENGTH)],
      };
    case 'phoneNumber':
      return { customFormErrors: [], validators: [] };
  }
}

export function contactInfoSyncFieldConfigForField(field: FieldName, translate: TranslateService): ContactInfoSyncFieldConfig {
  return getContactInfoFieldValidation(field, translate);
}

export function contactInfoSyncValidatorsForField(field: FieldName): ValidatorFn[] {
  return getContactInfoFieldValidation(field, noopTranslate).validators;
}
