import { inject, Injectable } from '@angular/core';
import { Router } from '@angular/router';

import { STORAGE_SERVICE } from '@fz/storage';

import { StorageKey } from '../../../app/enums/storage.enum';
import { FeatureFlags } from '../../optimizely/feature-flags';
import { OptimizelyService } from '../../optimizely/optimizely.service';
import { PartnerService } from '../partner/partner.service';
import { UserService } from '../user/user.service';
import { DistributorSessionStore } from './distributor-session.store';

interface BusinessAsOrganizationSession {
  enabled: boolean;
  organizationId: number;
}

@Injectable({ providedIn: 'root' })
export class BusinessAsOrganizationSessionService {
  readonly #distributorSession = inject(DistributorSessionStore);
  readonly #optimizely = inject(OptimizelyService);
  readonly #partnerService = inject(PartnerService);
  readonly #router = inject(Router);
  readonly #storage = inject(STORAGE_SERVICE);
  readonly #userService = inject(UserService);

  reconcile(organizationId: number): boolean {
    const enabled = this.#optimizely.isFeatureEnabled({
      optimizelyFeatureKey: FeatureFlags.BUSINESS_AS_ORGANIZATION,
      team: 'b2b-resellers',
    });
    if (enabled === null) {
      return false;
    }

    const session = this.#storage.get<BusinessAsOrganizationSession>(StorageKey.businessAsOrganizationSession);
    if (session === null || session.organizationId !== organizationId) {
      this.#stamp(organizationId, enabled);

      return false;
    }

    if (session.enabled === enabled) {
      return false;
    }

    this.#tearDownOrganizationScopedSession();
    this.#stamp(organizationId, enabled);
    void this.#router.navigate(['/login'], { replaceUrl: true });

    return true;
  }

  #stamp(organizationId: number, enabled: boolean): void {
    this.#storage.set<BusinessAsOrganizationSession>(StorageKey.businessAsOrganizationSession, { enabled, organizationId });
  }

  #tearDownOrganizationScopedSession(): void {
    this.#partnerService.clearPartner();
    this.#distributorSession.clear();
    this.#userService.clearPermissions();
    this.#storage.remove(StorageKey.selectedOrganization);
    this.#storage.remove(UserService.selectedOrganizationRoleKey);
    this.#storage.remove(UserService.organizationCountKey);
    this.#storage
      .keys()
      .filter(key => key.startsWith(StorageKey.selectedPartner))
      .forEach(key => this.#storage.remove(key));
  }
}
