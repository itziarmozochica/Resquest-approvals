import { CustomerQuestionCapabilities } from '@fz-original/app/shared/booking-questions-catalog/models/customer-question.model';

import { PartnerAccessLevel } from '../models/partner-access-level.enum';

export const DEFAULT_PARTNER_ACCESS_LEVEL = PartnerAccessLevel.FULL_ACCESS;

export function partnerAccessLevelFromCapabilities(capabilities: CustomerQuestionCapabilities): PartnerAccessLevel {
  if (capabilities.canModify) {
    return capabilities.canAssign ? PartnerAccessLevel.FULL_ACCESS : PartnerAccessLevel.EDIT_ACCESS;
  }

  return capabilities.canAssign ? PartnerAccessLevel.ASSIGN_ACCESS : PartnerAccessLevel.VIEW_ACCESS;
}

export function capabilitiesFromPartnerAccessLevel(level: PartnerAccessLevel): CustomerQuestionCapabilities {
  const canModify = level === PartnerAccessLevel.FULL_ACCESS || level === PartnerAccessLevel.EDIT_ACCESS;
  const canAssign = level === PartnerAccessLevel.FULL_ACCESS || level === PartnerAccessLevel.ASSIGN_ACCESS;

  return {
    canAssign,
    canDelete: canModify,
    canModify,
    canViewAnswers: true,
    canViewDetails: true,
  };
}
