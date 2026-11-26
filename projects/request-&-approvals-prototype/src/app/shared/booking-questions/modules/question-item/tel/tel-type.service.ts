import { inject, Injectable } from '@angular/core';
import { UntypedFormControl } from '@angular/forms';

import { CountryCode, getCountryCallingCode } from 'libphonenumber-js';

import { Partner } from '../../../../models/partner/partner.model';
import { PartnerService } from '../../../../services/partner/partner.service';
import { BookingQuestion, BookingQuestionType, FormGroupControl, TelTypeValue } from '../../../models';
import { countryValidator, telFormatValidator, telRequiredValidator } from '../../form-group/tel-type/tel-type.validator';

@Injectable()
export class TelTypeFormGroupControl implements FormGroupControl<TelTypeValue, Array<string> | null> {
  readonly #partnerService = inject(PartnerService);

  create(question: BookingQuestion): UntypedFormControl {
    const initialValue = resolveTelFormControlInitialValue(question, this.#partnerService.getPartner());
    const control = new UntypedFormControl(initialValue);
    const validators = [];

    if (!question.optional) {
      validators.push(telRequiredValidator());
    }

    validators.push(countryValidator());
    validators.push(telFormatValidator());

    control.setValidators(validators);
    return control;
  }

  displayValue(question: BookingQuestion, value: TelTypeValue): Array<string> | null {
    return this.value(question, value);
  }

  type(): BookingQuestionType {
    return 'tel';
  }

  value(_: BookingQuestion, value: TelTypeValue): Array<string> | null {
    if (value?.prefix && value?.phone && value?.country) {
      return [value.prefix + '|' + value.phone, value.country];
    }

    return null;
  }
}

export function resolveTelFormControlInitialValue(question: BookingQuestion, partner: Partner | null): TelTypeValue | null {
  const { defaultValues } = question;
  if (defaultValues == null || (Array.isArray(defaultValues) && defaultValues.length === 0)) {
    return buildPartnerCountryDefaultTelValue(partner);
  }

  return defaultValues as unknown as TelTypeValue;
}

export function buildPartnerCountryDefaultTelValue(partner: Partner | null): TelTypeValue | null {
  const countryCode = partner?.countryCode;
  if (!countryCode) {
    return null;
  }

  try {
    const prefix = `+${getCountryCallingCode(countryCode.toUpperCase() as CountryCode)}`;
    return { country: countryCode.toLowerCase(), phone: '', prefix };
  } catch {
    return null;
  }
}
