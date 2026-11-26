import { ValidatorFn, Validators } from '@angular/forms';

import { getDocumentTypeOptions, type NominativeRequestDocumentTypeOption } from '@fz/invoicing';

import { FullInvoiceDocumentTypeOption } from '../models/nominative-request.model';

export const nominativeRequiredTextValidators: ReadonlyArray<ValidatorFn> = [Validators.required, Validators.pattern(/\S/)];

export function getFullInvoiceDocumentTypeOptions(
  selectedCountry: string,
  orderCountry: string | null | undefined,
): ReadonlyArray<FullInvoiceDocumentTypeOption> {
  return getDocumentTypeOptions(selectedCountry, orderCountry).map(option => ({
    labelKey: documentTypeLabelKey(option),
    value: option.value,
  }));
}

function documentTypeLabelKey(option: NominativeRequestDocumentTypeOption): string {
  const scheme = option.scheme === 'colombia' ? 'co' : 'default';

  return `invoicing.fullInvoice.fields.customerTypeOptions.${scheme}.${option.customerType}`;
}
