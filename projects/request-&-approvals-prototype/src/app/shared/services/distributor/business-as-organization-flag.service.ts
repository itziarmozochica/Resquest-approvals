import { inject, Injectable } from '@angular/core';

import { STORAGE_SERVICE } from '@fz/storage';

import { StorageKey } from '../../../app/enums/storage.enum';
import { Organization } from '../../models/organization/organization.model';
import { FeatureFlags } from '../../optimizely/feature-flags';
import { OptimizelyService } from '../../optimizely/optimizely.service';

export const PILOT_BUSINESS_ORGANIZATIONS_PAGE_SIZE = 50;

@Injectable({ providedIn: 'root' })
export class BusinessAsOrganizationFlagService {
  readonly #optimizely = inject(OptimizelyService);
  readonly #storage = inject(STORAGE_SERVICE);

  isEnabled(): boolean {
    if (this.#optimizely.getFeatureUrlOverride(FeatureFlags.BUSINESS_AS_ORGANIZATION) === false) {
      return false;
    }
    if (
      this.isEnabledGlobally() ||
      this.#optimizely.isFeatureEnabled({ optimizelyFeatureKey: FeatureFlags.DISTRIBUTOR_MEMBERS, team: 'b2b-resellers' }) === true
    ) {
      return true;
    }

    const selectedOrganization = this.#selectedOrganization();
    return selectedOrganization !== null && this.isPilotBusinessOrganization(selectedOrganization);
  }

  isPilotPartnerOfSelectedOrganization(partnerId: number): boolean {
    const pilotPartnerIds = this.#selectedOrganization()?.partnerOrganizationIds ?? [];
    return pilotPartnerIds.includes(partnerId) && this.isEnabledForAnyPartner([partnerId]);
  }

  #selectedOrganization(): Organization | null {
    return this.#storage.get<Organization>(StorageKey.selectedOrganization) ?? null;
  }

  isEnabledGlobally(): boolean {
    if (this.#optimizely.getFeatureUrlOverride(FeatureFlags.BUSINESS_AS_ORGANIZATION) === false) {
      return false;
    }

    return (
      this.#optimizely.isFeatureEnabled({ optimizelyFeatureKey: FeatureFlags.BUSINESS_AS_ORGANIZATION, team: 'b2b-resellers' }) === true
    );
  }

  pilotBusinessOrganizations(fetched: Organization[], listed: Organization[]): Organization[] {
    return fetched.filter(
      organization =>
        !listed.some(organizationListed => organizationListed.id === organization.id) && this.isPilotBusinessOrganization(organization),
    );
  }

  isPilotBusinessOrganization(organization: Organization): boolean {
    return organization.category === 'distributors' && this.isEnabledForAnyPartner(organization.partnerOrganizationIds ?? []);
  }

  isEnabledForAnyPartner(partnerIds: number[]): boolean {
    if (this.#optimizely.getFeatureUrlOverride(FeatureFlags.BUSINESS_AS_ORGANIZATION) === false) {
      return false;
    }

    return partnerIds.some(
      partnerId =>
        this.#optimizely.isFeatureEnabled(
          { optimizelyFeatureKey: FeatureFlags.DISTRIBUTOR_MEMBERS, team: 'b2b-resellers' },
          { partner_id: String(partnerId) },
        ) === true,
    );
  }
}
