import { ChangeDetectionStrategy, Component, ErrorHandler, inject, input } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';

import { OrderJourneyComponent } from '@fz-original/app/shared/components/order/components/order-journey/order-journey.component';
import type { Journey } from '@fz-original/app/shared/models/journey/journey.model';
import { PartnerService } from '@fz-original/app/shared/services/partner/partner.service';
import { PurchaseService } from '@fz-original/app/shared/services/purchase/purchase.service';
import { catchError, map, of, startWith, switchMap, tap, type Observable } from 'rxjs';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [OrderJourneyComponent],
  selector: 'app-purchased-cart-journey',
  styleUrl: './purchased-cart-journey.component.scss',
  templateUrl: './purchased-cart-journey.component.html',
})
export class PurchasedCartJourneyComponent {
  readonly orderId = input.required<number>();

  readonly #errorHandler = inject(ErrorHandler);
  readonly #partnerService = inject(PartnerService);
  readonly #purchaseService = inject(PurchaseService);

  protected readonly journey = toSignal(
    toObservable(this.orderId).pipe(
      // `startWith(null)` clears the previous order's journey at once, and `switchMap` drops its late answer.
      switchMap(orderId => this.#loadJourney(orderId).pipe(startWith(null))),
    ),
    { initialValue: null },
  );

  #loadJourney(orderId: number): Observable<Journey | null> {
    const partnerId = this.#partnerService.getActingOrganizationId();
    if (!partnerId) {
      return of(null);
    }

    return this.#purchaseService.getOrder(partnerId, orderId).pipe(
      tap(response => {
        if (response.error) {
          this.#errorHandler.handleError(response.error);
        }
      }),
      map(response => response.data?.journey ?? null),
      catchError((error: unknown) => {
        this.#errorHandler.handleError(error);
        return of(null);
      }),
    );
  }
}
