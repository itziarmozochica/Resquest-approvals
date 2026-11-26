import type { DistributorPartnerConfig } from '@fz/b2b-iam';

export const DISTRIBUTOR_PARTNER_QUERY_PARAM = 'distributorPartnerId';

export function matchPartnerParam(value: string | null, partners: readonly DistributorPartnerConfig[]): DistributorPartnerConfig | null {
  if (value === null || value.trim() === '') {
    return null;
  }

  const partnerOrganizationId = Number(value);
  if (!Number.isInteger(partnerOrganizationId)) {
    return null;
  }

  return partners.find(partner => partner.partnerOrganizationId === partnerOrganizationId) ?? null;
}
