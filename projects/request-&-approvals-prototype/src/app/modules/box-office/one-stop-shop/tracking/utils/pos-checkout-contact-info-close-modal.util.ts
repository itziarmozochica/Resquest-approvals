import { Customer } from '@fz-original/app/shared/models/customer/customer.model';

import {
  type PosCheckoutContactInfoCloseModalAction,
  type PosCheckoutContactInfoField,
} from '../events/pos-checkout-contact-info-close-modal.event';

export function getVisibleContactInfoFields(showEmail: boolean, showPhoneNumber: boolean): PosCheckoutContactInfoField[] {
  const fields: PosCheckoutContactInfoField[] = ['first_name', 'last_name'];

  if (showEmail) {
    fields.push('email');
  }

  if (showPhoneNumber) {
    fields.push('phone');
  }

  return fields;
}

export function getRequiredContactInfoFields(mandatoryFields: string[]): PosCheckoutContactInfoField[] {
  const fields: PosCheckoutContactInfoField[] = [];

  for (const field of mandatoryFields) {
    if (field === 'email') {
      fields.push('email');
    }

    if (field === 'phoneNumber') {
      fields.push('phone');
    }

    if (field === 'firstName') {
      fields.push('first_name');
    }

    if (field === 'lastName') {
      fields.push('last_name');
    }
  }

  return fields;
}

export function getFilledContactInfoFields(customer: Customer | null): PosCheckoutContactInfoField[] {
  if (customer === null) {
    return [];
  }

  const fields: PosCheckoutContactInfoField[] = [];

  if (customer.firstName !== 'Generic user') {
    if (customer.firstName) {
      fields.push('first_name');
    }

    if (customer.lastName) {
      fields.push('last_name');
    }
  }

  if (customer.email) {
    fields.push('email');
  }

  if (customer.phoneNumber) {
    fields.push('phone');
  }

  return fields;
}

export function resolveContactInfoCloseModalAction(
  customer: Customer | null,
  mandatoryFields: string[],
  options?: { autoFilled?: boolean },
): PosCheckoutContactInfoCloseModalAction {
  if (customer === null) {
    return 'close';
  }

  if (options?.autoFilled) {
    return 'continue';
  }

  const hasDeliveryContact = Boolean(customer.email) || Boolean(customer.phoneNumber);

  if (mandatoryFields.length === 0 && !hasDeliveryContact) {
    return 'skip';
  }

  return 'continue';
}
