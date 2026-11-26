import { computed, inject, Injectable, type Signal } from '@angular/core';

import type { DistributorTarget } from '@fz/reservations';
import { Observable, of } from 'rxjs';

import { PartnerService } from '../partner/partner.service';
import { DistributorSessionStore } from './distributor-session.store';

export const DISTRIBUTOR_PARTNER_NOT_SELECTED = 'DISTRIBUTOR_PARTNER_NOT_SELECTED';

@Injectable({ providedIn: 'root' })
export class DistributorTargetService {
  readonly #partnerService = inject(PartnerService);
  readonly #store = inject(DistributorSessionStore);

  /** The flag is already checked by the start-up path that sets `isDistributorSession`. */
  readonly isDistributorSession: Signal<boolean> = this.#store.isDistributorSession;

  /**
   * The chosen partner config's type. The session business cannot answer this: it is the distributor
   * itself, and `toFeverZoneBusiness` maps it to `agency` for every partner, whatever the partner is.
   */
  readonly businessType: Signal<string | null> = computed(() => {
    if (!this.isDistributorSession()) {
      return null;
    }
    return this.#store.selectedPartnerConfig()?.type ?? null;
  });

  /** The chosen partner config's channel. `UserService.getBusinessChannel()` is empty in this session. */
  readonly channel: Signal<string | null> = computed(() => {
    if (!this.isDistributorSession()) {
      return null;
    }
    return this.#store.selectedPartnerConfig()?.channel ?? null;
  });

  readonly target: Signal<DistributorTarget | null> = computed(() => {
    if (!this.isDistributorSession()) {
      return null;
    }

    const selected = this.#store.selectedPartnerConfig();
    const distributorId = this.#partnerService.getPartner()?.id;

    return selected && distributorId ? { distributorId, targetOrganizationId: selected.partnerOrganizationId } : null;
  });

  /**
   * The dispatch, asked once and answered three ways: `null` runs today's code, a `null` emission is a
   * distributor session with nothing chosen so nothing is called (§4.4 R1), and otherwise the library is
   * called with the chosen pair. What comes back is the library's answer untouched - a failure arrives
   * thrown, as `@fz/ticketing` does it, so each caller handles it where it already handles its own.
   *
   * The nothing-chosen case emits rather than completing empty. `EMPTY` skips every `map` downstream, so
   * the caller never hears that the call did not happen: on a first visit with two partners and none
   * remembered, ticketing waited for a `next` that never came and drew neither the filter nor an error.
   * R1 asks that nothing be sent, which this still satisfies.
   */
  throughDistributor<T>(call: (target: DistributorTarget) => Observable<T>): Observable<T | null> | null {
    if (!this.isDistributorSession()) {
      return null;
    }

    const target = this.target();
    if (target === null) {
      return of(null);
    }

    return call(target);
  }
}
