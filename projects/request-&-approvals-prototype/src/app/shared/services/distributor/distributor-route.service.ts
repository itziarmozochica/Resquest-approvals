import { inject, Injectable } from '@angular/core';

import type { DistributorTarget } from '@fz/reservations';

import { SCOPED_ORGANIZATION_HEADER } from '../../interceptors/custom-headers';
import { PartnerService } from '../partner/partner.service';
import { DistributorTargetService } from './distributor-target.service';

/** The pair-rooted segment for the families that assemble a reservation outside `@fz/reservations`. */
export function distributorSegment(target: DistributorTarget): string {
  return `distributors/${target.distributorId}/partners/${target.targetOrganizationId}`;
}

export function scopedOrganizationHeader(target: DistributorTarget): Record<string, string> {
  return scopedOrganizationHeaderFor(target.distributorId);
}

export function scopedOrganizationHeaderFor(distributorId: number): Record<string, string> {
  return { [SCOPED_ORGANIZATION_HEADER]: String(distributorId) };
}

@Injectable({ providedIn: 'root' })
export class DistributorRouteService {
  readonly #distributorTarget = inject(DistributorTargetService);
  readonly #partnerService = inject(PartnerService);

  actingDistributorId(): number | null {
    if (!this.#distributorTarget.isDistributorSession()) {
      return null;
    }

    return this.#partnerService.getActingOrganizationId();
  }

  /** The chosen target, or `null` when this is not a distributor session - which means today's URL. */
  pairTarget(): DistributorTarget | null {
    return this.#distributorTarget.isDistributorSession() ? this.#distributorTarget.target() : null;
  }

  /**
   * The channel a pair-rooted call must ask about: the chosen partner config's, never the caller's
   * session. Empty stays omitted - a distributor has no single business channel, so sending one would
   * ask about the wrong concession rather than about any.
   */
  pairChannel(): string | undefined {
    return this.#distributorTarget.channel() || undefined;
  }

  /** A distributor session with nothing chosen: calling anything would act as an organization that sells nothing. */
  isBlocked(): boolean {
    return this.#distributorTarget.isDistributorSession() && this.#distributorTarget.target() === null;
  }
}
