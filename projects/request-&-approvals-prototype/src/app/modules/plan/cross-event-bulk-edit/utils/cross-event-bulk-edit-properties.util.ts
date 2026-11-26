import {
  AddOnCategory,
  SessionType,
  SessionTypeBulkEditProperty,
  SessionTypeBulkEditPropertyValue,
} from '@fz-original/app/shared/services/sessions/session-type.model';

export function canContinueFromProperties(selectedProperties: readonly SessionTypeBulkEditPropertyValue[]): boolean {
  return selectedProperties.length > 0;
}

export function crossEventBulkEditRestrictedProperties(
  sessionTypes: readonly SessionType[],
  isTicketTypeEditionLimited: boolean,
): SessionTypeBulkEditPropertyValue[] {
  const isProductTypeRestricted =
    isTicketTypeEditionLimited ||
    sessionTypes.some(
      sessionType =>
        sessionType.packedSessionTypes != null || sessionType.addOnConfiguration?.category === AddOnCategory.premiumRefundPolicy,
    );

  if (!isProductTypeRestricted) {
    return [];
  }

  return [SessionTypeBulkEditProperty.productType];
}

export function withoutRestrictedProperties(
  selectedProperties: readonly SessionTypeBulkEditPropertyValue[],
  restrictedProperties: readonly SessionTypeBulkEditPropertyValue[],
): SessionTypeBulkEditPropertyValue[] {
  const restricted = new Set(restrictedProperties);
  return selectedProperties.filter(property => !restricted.has(property));
}
