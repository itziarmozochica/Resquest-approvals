import { BusinessRoleLabel } from '../enums/business-role-label.enum';
import { Organization } from '../models/organization/organization.model';
import { OrganizationTypeEnum } from '../models/partner/organization-type.enum';

const hiddenPartnerRoles = new Set<string>([BusinessRoleLabel.BUSINESS_MANAGER, BusinessRoleLabel.BUSINESS_CASHIER]);

export function hideBusinessPartnerOrganizations(organizations: Organization[]): Organization[] {
  return organizations.filter(
    organization =>
      organization.type !== OrganizationTypeEnum.PARTNER ||
      organization.userRoleInOrganization == null ||
      !hiddenPartnerRoles.has(organization.userRoleInOrganization),
  );
}
