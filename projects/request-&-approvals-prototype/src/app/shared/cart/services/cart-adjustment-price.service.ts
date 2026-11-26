import { DestroyRef, inject, Injectable } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { SessionItem } from '@fz-original/app/modules/sessions/session-item.model';
import { PartnerService } from '@fz-original/app/shared/services/partner/partner.service';
import { ToastService, ToastType } from '@fz-original/app/shared/services/toast/toast.service';
import { TranslateService } from '@ngx-translate/core';
import { catchError, debounceTime, EMPTY, finalize, Subject, switchMap } from 'rxjs';

import { Cart } from '../../models/cart/cart.model';
import { CartAdjustmentPrice, CartAdjustmentPriceCalculation, CartAdjustmentPriceOperation } from '../models/cart-adjustment-price.model';
import { CART_DETAIL_SERVICE, CartDetailService } from './cart-detail.service';
import { CartPreviewService } from './cart-preview.service';

@Injectable()
export class CartAdjustmentPriceService {
  readonly #cartDetailService = inject(CART_DETAIL_SERVICE, { optional: true }) ?? inject(CartDetailService);
  readonly #cartPreviewService = inject(CartPreviewService);
  readonly #partnerService = inject(PartnerService);
  readonly #toastService = inject(ToastService);
  readonly #translateService = inject(TranslateService);
  readonly #destroyRef = inject(DestroyRef);
  readonly #update$ = new Subject<CartAdjustmentPrice | null>();

  constructor() {
    // The cart detail that provides this service can be destroyed while a change waits for its debounce:
    // nothing else would release the flag `apply` set, and the wizard would stay with its actions disabled.
    this.#destroyRef.onDestroy(() => this.#cartDetailService.setUpdatingCart(false));
    this.#update$
      .pipe(
        debounceTime(500),
        takeUntilDestroyed(this.#destroyRef),
        switchMap(adjustment => {
          if (adjustment !== null && !this.#cartDetailService.validateAdjustmentPrice(adjustment)) {
            this.#cartDetailService.setUpdatingCart(false);
            return EMPTY;
          }
          const partnerId = this.#partnerService.getPartner()?.id;
          const cart = this.#cartDetailService.cart();
          if (!partnerId || !cart || !cart.id) {
            this.#cartDetailService.setUpdatingCart(false);
            return EMPTY;
          }
          // Set again here: switching away from a preview in flight runs its finalize, which releases the flag.
          this.#cartDetailService.setUpdatingCart(true);
          return this.#cartPreviewService
            .getCartPreview({
              cartId: cart.id,
              partnerId,
              sessionItems: this.#getSessionItems(cart),
              adjustment: adjustment ?? this.#zeroedPersistedAdjustment(),
              heldSessions: Array.from(cart.sessionItemsByDatetime.values()).flat(),
            })
            .pipe(
              catchError(() => {
                this.#showErrorToast();
                return EMPTY;
              }),
              finalize(() => this.#cartDetailService.setUpdatingCart(false)),
            );
        }),
      )
      .subscribe({
        next: response => {
          if (response.data && !response.error) {
            this.#cartDetailService.setCart(response.data);
            return;
          }
          if (response.error) {
            this.#showErrorToast();
          }
        },
      });
  }

  apply(adjustment: CartAdjustmentPrice | null): void {
    // The cart is stale from this moment, not from the debounced request: a save in between would carry
    // the previous adjustment, so the callers disable their continue actions while the cart is updating.
    this.#cartDetailService.setUpdatingCart(true);
    this.#update$.next(adjustment);
  }

  #showErrorToast(): void {
    this.#toastService.add({
      message: this.#translateService.instant('cart.adjustment.errorOnPreview'),
      type: ToastType.ERROR,
      autoHide: true,
    });
  }

  #getSessionItems(cart: Cart): SessionItem[] {
    if (!cart.sessionItemsByDatetime || cart.sessionItemsByDatetime.size === 0) {
      return [];
    }
    const sessions = cart.sessionItemsByDatetime.get(cart.sessionItemsByDatetime.keys().next().value ?? '');
    const items: SessionItem[] = [];
    sessions?.forEach(session => {
      items.push(new SessionItem(session.sessionId, session.units));
    });
    return items;
  }

  /**
   * Switching the override off on a cart whose adjustment is already stored (a quote being modified) cannot
   * remove it: the preview and the update keep a stored adjustment when the request omits it. Previewing
   * amount 0 is the only way the backend offers today to leave the cart at catalog prices, and the save
   * then PUTs that 0, until the backend accepts an explicit null to remove it. A fixed subtract of 0 is a no-op
   * whatever the stored calculation was, so a stored "final" never turns into a final price of 0.
   */
  #zeroedPersistedAdjustment(): CartAdjustmentPrice | undefined {
    const persisted = this.#cartDetailService.persistedAdjustment();
    if (persisted === null) {
      return undefined;
    }
    return {
      amount: 0,
      calculation: CartAdjustmentPriceCalculation.FIXED,
      concept: persisted.concept,
      operation: CartAdjustmentPriceOperation.SUBTRACT,
    };
  }
}
