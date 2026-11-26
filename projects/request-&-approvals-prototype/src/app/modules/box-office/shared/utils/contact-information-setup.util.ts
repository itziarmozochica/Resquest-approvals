import {
  ContactInformationFieldEnum,
  ContactInformationOrderableFieldEnum,
  ContactInformationRequirementEnum,
  ContactInformationSetup,
} from '../models/onsite-setup';
import { resolveContactInformationFieldsOrder } from './contact-information-fields-order.util';

export interface OnsiteContactInformationSetupValue {
  fields: ContactInformationFieldEnum[];
  fieldsOrder: ContactInformationOrderableFieldEnum[];
  requirement: ContactInformationRequirementEnum;
}

export function toOnsiteContactInformationSetupValue(
  setup: ContactInformationSetup | null | undefined,
  fallbackFieldsOrder: readonly ContactInformationOrderableFieldEnum[] | null,
): OnsiteContactInformationSetupValue {
  const fields = setup?.fields && setup.fields.length > 0 ? setup.fields : [ContactInformationFieldEnum.EMAIL];
  return {
    fields,
    fieldsOrder: resolveContactInformationFieldsOrderForFields(fields, setup?.fields_order ?? fallbackFieldsOrder),
    requirement: setup?.requirement_on_current_day || ContactInformationRequirementEnum.OPTIONAL,
  };
}

export function resolveContactInformationFieldsOrderForFields(
  fields: readonly ContactInformationFieldEnum[],
  storedOrder: readonly ContactInformationOrderableFieldEnum[] | null | undefined,
): ContactInformationOrderableFieldEnum[] {
  return resolveContactInformationFieldsOrder(
    storedOrder,
    fields.includes(ContactInformationFieldEnum.EMAIL),
    fields.includes(ContactInformationFieldEnum.PHONE),
  );
}

export function toggleContactInformationField(
  value: OnsiteContactInformationSetupValue,
  field: ContactInformationFieldEnum,
): OnsiteContactInformationSetupValue {
  const fields = Object.values(ContactInformationFieldEnum).filter(candidate =>
    candidate === field ? !value.fields.includes(candidate) : value.fields.includes(candidate),
  );
  return { ...value, fields, fieldsOrder: resolveContactInformationFieldsOrderForFields(fields, value.fieldsOrder) };
}

export function hasContactInformationFields(value: OnsiteContactInformationSetupValue): boolean {
  return value.fields.length > 0;
}
