import { inject, Injectable } from '@angular/core';

import { Order } from '@fz-original/app/shared/models/order/order.model';
import { FeatureFlags } from '@fz-original/app/shared/optimizely/feature-flags';
import { OptimizelyService } from '@fz-original/app/shared/optimizely/optimizely.service';

import { ValidationSearchHandoff, ValidationSearchIncludes } from '../../models/validation-search-handoff.model';

@Injectable({
  providedIn: 'root',
})
export class ValidationSearchHandoffService {
  static readonly maxAgeMs = 15_000;

  readonly #optimizelyService = inject(OptimizelyService);
  #handedOffAt = 0;
  #handoff: ValidationSearchHandoff | null = null;

  discard(handoff: ValidationSearchHandoff): void {
    if (this.#handoff === handoff) {
      this.#handoff = null;
    }
  }

  handOff(handoff: ValidationSearchHandoff): void {
    this.#handoff = handoff;
    this.#handedOffAt = Date.now();
  }

  searchIncludes(): ValidationSearchIncludes {
    return {
      hideFeverDiscount: true,
      includeNotes: true,
      includeOrderItems: true,
      includePhoneNumber: true,
      includeReschedules: true,
      includeReservationChannel: true,
      includeUserCancellationRecords:
        this.#optimizelyService.isFeatureEnabled({
          optimizelyFeatureKey: FeatureFlags.USER_CANCELLATION_RECORDS,
          team: 'b2b-platform',
        }) ?? false,
    };
  }

  take(partnerId: number, orderId: number): Order[] | null {
    const handoff = this.#handoff;
    this.#handoff = null;
    if (
      handoff === null ||
      handoff.partnerId !== partnerId ||
      handoff.orderId !== orderId ||
      Date.now() - this.#handedOffAt > ValidationSearchHandoffService.maxAgeMs
    ) {
      return null;
    }
    return handoff.orders;
  }
}
