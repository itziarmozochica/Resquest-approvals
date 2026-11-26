import { inject, Injectable, Injector } from '@angular/core';
import { Router } from '@angular/router';

import { ValidationNavigationState } from '@fz-original/app/modules/validation/models/validation-navigation-state.model';
import { ValidationSearchHandoff } from '@fz-original/app/modules/validation/models/validation-search-handoff.model';
import { ValidationSearchHandoffService } from '@fz-original/app/modules/validation/services/search-handoff/validation-search-handoff.service';
import { audioFile } from '@fz-original/app/shared/services/audio/audio-file.enum';
import { AudioService } from '@fz-original/app/shared/services/audio/audio.service';
import { PartnerService } from '@fz-original/app/shared/services/partner/partner.service';
import { ProductSessionsSummaryService } from '@fz-original/app/shared/services/product-sessions-summary/product-sessions-summary.service';
import { ToastService } from '@fz-original/app/shared/services/toast/toast.service';
import { AlertSentiment } from '@ignite/legacy/components/ignt-alert/ignt-alert.component';
import { TranslateService } from '@ngx-translate/core';
import { take } from 'rxjs/operators';

import { PosTicketingState } from '../../state/pos-ticketing.state';
import { PosCouponsService } from '../coupons/pos-coupons.service';
import { PosTicketSelectionService } from '../ticket-selection/pos-ticket-selection.service';
import { TicketingCoreService } from '../ticketing-core/ticketing-core.service';

/**
 * Barcode resolution: coupon / product / order / not-found. The keyboard listener stays on the
 * component (`ScannerService.observeScanCode()`) — this strategy is handed the raw code.
 */
@Injectable()
export class PosScannerService {
  readonly #audio = inject(AudioService);
  readonly #core = inject(TicketingCoreService);
  readonly #injector = inject(Injector);
  readonly #partnerService = inject(PartnerService);
  /** Synchronous reads over the already-loaded retail catalog — not API-shaped. */
  readonly #productCatalog = inject(ProductSessionsSummaryService);
  readonly #router = inject(Router);
  readonly #searchHandoff = inject(ValidationSearchHandoffService);
  readonly #state = inject(PosTicketingState);
  readonly #toastService = inject(ToastService);
  readonly #translate = inject(TranslateService);

  // Lazily resolved for the same reason as in `PosTicketSelectionService`: the call graph is
  // bidirectional, so eager field injection risks a DI cycle (NG0200).
  #couponsStrategy?: PosCouponsService;
  #ticketSelectionStrategy?: PosTicketSelectionService;

  constructor() {
    // Preloaded eagerly so the failure cue is ready before the first bad scan.
    this.#audio.preload(audioFile.scanError);
  }

  /**
   * A catalog hit adds one unit and scrolls the cart to it; a miss with a catalog that has not
   * finished loading warns and stops; anything else falls through to the order lookup.
   */
  handleProductScannedCode(code: string): void {
    const productSession = this.#productCatalog.getSessionDataByProductCode(code);
    if (productSession) {
      if (!this.#state.isProductCatalogLoaded()) {
        this.#showCatalogNotLoadedToast();
        return;
      }
      const previousCount = this.#state.selectedTicketsBySessionId.get(productSession.id.toString()) ?? 0;
      this.#ticketSelection.addProductSessionToCartUsingTicketTypeCounter(productSession, true);
      this.#ticketSelection.trackPosCartItemQuantityChange({
        newCount: previousCount + 1,
        previousCount,
        sessionId: productSession.id,
        source: 'from_scanner',
      });
      this.#state.scrollToCartItem$.next(productSession.id);
      return;
    }

    if (this.#state.hasProductCatalog() && !this.#state.isProductCatalogLoaded()) {
      // The guard fires before the lookup when the catalog is still loading.
      this.#showCatalogNotLoadedToast();
      return;
    }

    this.#handleScannedOrderCode(code);
  }

  /**
   * Single entry point. Dispatch order is intentional: an open promo-code modal
   * swallows the code, a retail-enabled setup tries the product catalog, everything else is an order.
   */
  handleScannedCode(code: string): void {
    if (this.#state.hasModalCouponCodeOpened) {
      this.#coupons.autoFillCouponFromScanner(code);
      return;
    }
    const activeSetup = this.#state.activeOnsiteSetup();
    if (activeSetup && activeSetup?.warehouse_id && activeSetup?.retail_setup_id) {
      this.handleProductScannedCode(code);
      return;
    }

    this.#handleScannedOrderCode(code);
  }

  /** A toast plus the failure cue, never a modal, so it bypasses `PosUiPortService`. */
  showScannedCodeNotFoundToast(message: string): void {
    this.#toastService.add({
      autoHide: true,
      contrast: true,
      delay: 3000,
      message,
      sentiment: AlertSentiment.danger,
    });
    this.#audio.play(audioFile.scanError);
  }

  get #coupons(): PosCouponsService {
    return (this.#couponsStrategy ??= this.#injector.get(PosCouponsService));
  }

  /** Only an unambiguous single result counts as resolved. */
  #extractOrderIdFromSearchResponse(orders: { id?: number }[]): string {
    if (orders.length !== 1 || orders[0].id === undefined || orders[0].id === null) {
      return '';
    }
    return String(orders[0].id);
  }

  // ═══════════════════════════════════════════ internals ══════════════════════════════════════════

  /**
   * Product-scan fallback used when no partner id is available. Kept separate from
   * {@link handleProductScannedCode} so the order lookup cannot recurse.
   */
  #handleProductScannedCodeWithoutOrderFallback(code: string): void {
    if (!this.#state.isProductCatalogLoaded()) {
      this.#showCatalogNotLoadedToast();
      return;
    }

    const productSession = this.#productCatalog.getSessionDataByProductCode(code);

    if (productSession) {
      const previousCount = this.#state.selectedTicketsBySessionId.get(productSession.id.toString()) ?? 0;
      this.#ticketSelection.addProductSessionToCartUsingTicketTypeCounter(productSession, true);
      this.#ticketSelection.trackPosCartItemQuantityChange({
        newCount: previousCount + 1,
        previousCount,
        sessionId: productSession.id,
        source: 'from_scanner',
      });
    } else {
      const errorMessage = this.#translate.instant('boxOffice.cart.toastBanner.errorMessage', {
        code: code,
      });
      this.showScannedCodeNotFoundToast(errorMessage);
    }
  }

  /**
   * Resolves the code against the partner's orders and opens the validation
   * detail on an unambiguous single hit.
   */
  #handleScannedOrderCode(scannedCode: string): void {
    const normalizedCode = scannedCode.trim();
    const partnerId = this.#partnerService.getPartner()?.id;
    if (partnerId === undefined || partnerId === null) {
      // No partner id: fall back to the product-scan path without an order lookup.
      this.#handleProductScannedCodeWithoutOrderFallback(scannedCode);
      return;
    }

    this.#core
      .searchOrders({ ...this.#searchHandoff.searchIncludes(), code: normalizedCode, partnerId })
      .pipe(take(1))
      .subscribe({
        error: () => this.#showOrderOrProductNotFoundToast(scannedCode),
        next: response => {
          const orders = response.data ?? [];
          const resolvedOrderId = this.#extractOrderIdFromSearchResponse(orders);
          if (!resolvedOrderId) {
            this.#showOrderOrProductNotFoundToast(scannedCode);
            return;
          }
          const handoff: ValidationSearchHandoff = { orderId: Number(resolvedOrderId), orders, partnerId };
          this.#searchHandoff.handOff(handoff);
          this.#navigateToOrderDetail(resolvedOrderId, handoff);
        },
      });
  }

  #navigateToOrderDetail(orderId: string, handoff: ValidationSearchHandoff): void {
    const state: ValidationNavigationState = { fromScan: true };
    void this.#router.navigate(['/validation'], { queryParams: { id: orderId, type: 'order' }, state }).then(navigated => {
      if (!navigated) {
        this.#searchHandoff.discard(handoff);
      }
    });
  }

  /** The warning branch of `handleProductScannedCode`. */
  #showCatalogNotLoadedToast(): void {
    const warningMessage = this.#translate.instant('boxOffice.cart.toastBanner.catalogNotLoadedMessage');
    this.#toastService.add({
      autoHide: true,
      delay: 3000,
      message: warningMessage,
      sentiment: AlertSentiment.warning,
    });
  }

  /** The message depends on whether this setup has a retail catalog at all. */
  #showOrderOrProductNotFoundToast(code: string): void {
    const messageKey = this.#state.hasProductCatalog()
      ? 'boxOffice.cart.toastBanner.errorMessage'
      : 'boxOffice.cart.toastBanner.orderNotFoundMessage';

    const message = this.#translate.instant(messageKey, { code });
    this.showScannedCodeNotFoundToast(message);
  }

  get #ticketSelection(): PosTicketSelectionService {
    return (this.#ticketSelectionStrategy ??= this.#injector.get(PosTicketSelectionService));
  }
}
