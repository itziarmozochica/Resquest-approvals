import type { DistributorPartnerConfig } from '@fz/b2b-iam';

export function isUsablePartner(config: DistributorPartnerConfig): boolean {
  return config.channel !== '';
}

export function usablePartners(partnerConfigs: readonly DistributorPartnerConfig[]): DistributorPartnerConfig[] {
  return partnerConfigs.filter(isUsablePartner);
}

export function hasUsablePartner(partnerConfigs: readonly DistributorPartnerConfig[]): boolean {
  return partnerConfigs.some(isUsablePartner);
}
