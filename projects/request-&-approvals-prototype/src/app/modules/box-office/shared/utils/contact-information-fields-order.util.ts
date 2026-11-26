import { ContactInformationOrderableFieldEnum } from '../models/onsite-setup';

export const DEFAULT_CONTACT_INFORMATION_FIELDS_ORDER: readonly ContactInformationOrderableFieldEnum[] = [
  ContactInformationOrderableFieldEnum.FIRST_NAME,
  ContactInformationOrderableFieldEnum.LAST_NAME,
  ContactInformationOrderableFieldEnum.EMAIL,
  ContactInformationOrderableFieldEnum.PHONE,
];

export const NEW_ONSITE_SETUP_CONTACT_INFORMATION_FIELDS_ORDER: readonly ContactInformationOrderableFieldEnum[] = [
  ContactInformationOrderableFieldEnum.EMAIL,
  ContactInformationOrderableFieldEnum.FIRST_NAME,
  ContactInformationOrderableFieldEnum.LAST_NAME,
  ContactInformationOrderableFieldEnum.PHONE,
];

export function resolveContactInformationFieldsOrder(
  fieldsOrder: readonly ContactInformationOrderableFieldEnum[] | null | undefined,
  showEmail: boolean,
  showPhoneNumber: boolean,
): ContactInformationOrderableFieldEnum[] {
  const visible = new Set<ContactInformationOrderableFieldEnum>([
    ContactInformationOrderableFieldEnum.FIRST_NAME,
    ContactInformationOrderableFieldEnum.LAST_NAME,
    ...(showEmail ? [ContactInformationOrderableFieldEnum.EMAIL] : []),
    ...(showPhoneNumber ? [ContactInformationOrderableFieldEnum.PHONE] : []),
  ]);
  const candidates = [...(fieldsOrder ?? []), ...DEFAULT_CONTACT_INFORMATION_FIELDS_ORDER];
  return candidates.filter((field, index) => visible.has(field) && candidates.indexOf(field) === index);
}
