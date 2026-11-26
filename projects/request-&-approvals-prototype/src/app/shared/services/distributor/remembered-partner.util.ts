import type { DistributorPartnerConfig } from '@fz/b2b-iam';
import type { StoragePort } from '@fz/storage';

import { StorageKey } from '../../../app/enums/storage.enum';

export function rememberedPartnerStorageKey(organizationId: number): string {
  return `${StorageKey.selectedPartner}:${organizationId}`;
}

export function readRememberedPartner(
  storage: StoragePort,
  partners: readonly DistributorPartnerConfig[],
  organizationId: number | null,
): DistributorPartnerConfig | null {
  if (organizationId === null) {
    return null;
  }

  const key = rememberedPartnerStorageKey(organizationId);
  const stored = storage.get<number | string>(key);
  if (stored === null || String(stored).trim() === '') {
    return null;
  }

  const remembered = Number(stored);
  const matched = partners.find(partner => partner.partnerOrganizationId === remembered) ?? null;

  if (matched === null) {
    storage.remove(key);
  }

  return matched;
}

export function rememberPartner(storage: StoragePort, partnerOrganizationId: number, organizationId: number | null): void {
  if (organizationId === null) {
    return;
  }

  storage.set(rememberedPartnerStorageKey(organizationId), partnerOrganizationId);
}
