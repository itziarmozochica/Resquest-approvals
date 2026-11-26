import { computed, inject, Injectable, Signal } from '@angular/core';

import type { DistributorPartnerConfig } from '@fz/b2b-iam';

import { DistributorSessionStore } from './distributor-session.store';
import { hasUsablePartner, usablePartners } from './usable-partners.util';

@Injectable({ providedIn: 'root' })
export class DistributorPartnersService {
  readonly #store = inject(DistributorSessionStore);

  readonly partners: Signal<DistributorPartnerConfig[]> = computed(() => usablePartners(this.#store.partnerConfigs()));

  readonly hasPartners: Signal<boolean> = computed(() => hasUsablePartner(this.#store.partnerConfigs()));
}
