import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  effect,
  EventEmitter,
  inject,
  Injector,
  input,
  Input,
  OnInit,
  Output,
  untracked,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import {
  posCheckoutPromoCodesInteraction,
  type PosCheckoutPromoCodesInteractionType,
} from '@fz-original/app/modules/box-office/one-stop-shop/tracking/events/pos-checkout-promo-codes-interaction.event';
import {
  posCheckoutPromoCodesOpenManualScanner,
  type PosCheckoutPromoCodesOpenManualScannerSource,
} from '@fz-original/app/modules/box-office/one-stop-shop/tracking/events/pos-checkout-promo-codes-open-manual-scanner.event';
import {
  posCheckoutPromoCodesShowModal,
  PosCheckoutPromoCodesShowModalData,
} from '@fz-original/app/modules/box-office/one-stop-shop/tracking/events/pos-checkout-promo-codes-show-modal.event';
import { ScannerComponent } from '@fz-original/app/modules/validation/components/scanner/scanner.component';
import { CouponCardEvent } from '@fz-original/app/shared/components/coupon-card/coupon-card-event';
import { CouponCodeEvent } from '@fz-original/app/shared/components/coupon-code/coupon-code-event';
import { CouponCodeModalComponent } from '@fz-original/app/shared/components/coupon-code/coupon-code-modal/coupon-code-modal.component';
import { FzTrackingService } from '@fz/fz-tracking/src/public-api';
import { IgntButtonComponent, IgntDialogService, type IgntDialogRef } from '@ignite/common';
import { TranslateModule } from '@ngx-translate/core';
import { BehaviorSubject, Observable, Subject } from 'rxjs';
import { take } from 'rxjs/operators';

import { CouponCodeSelectorModalComponent } from './coupon-code-selector-modal/coupon-code-selector-modal.component';
import { type CouponCodeModalResult, type CouponCodeSelectorModalResult } from './coupon-modals.model';
import { CouponCodeSelectorStore } from './store/coupon-code-selector.store';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IgntButtonComponent, TranslateModule],
  providers: [CouponCodeSelectorStore],
  selector: 'app-coupon-code-selector',
  standalone: true,
  styleUrls: ['./coupon-code-selector.component.scss'],
  templateUrl: './coupon-code-selector.component.html',
})
export class CouponCodeSelectorComponent implements OnInit {
  readonly #destroyRef = inject(DestroyRef);
  readonly #dialogService = inject(IgntDialogService);
  readonly #fzTracking = inject(FzTrackingService);
  readonly #injector = inject(Injector);
  readonly #store = inject(CouponCodeSelectorStore);
  #closingAfterCouponApply = false;
  #couponCodeDialogRef: IgntDialogRef<CouponCodeModalResult> | null = null;
  #dialogRef: IgntDialogRef<CouponCodeSelectorModalResult> | null = null;
  #lastPresetSelectionNonce = 0;
  #lastSearchInteractionNonce = 0;
  #pendingCouponCardEvent: CouponCardEvent | null = null;

  @Input() buttonSentiment: 'primary' | 'secondary' | 'tertiary' = 'secondary';
  @Input() buttonSize: 'small' | 'large' = 'large';
  @Input() hasLeadingIcon = true;
  @Output() couponCode = new EventEmitter<CouponCodeEvent>();
  @Input({ required: true }) couponCodeApplied$!: Observable<boolean>;
  @Input({ required: true }) error = new BehaviorSubject<Error | null>(null);
  @Output() modalClosed = new EventEmitter<void>();
  @Output() modalOpened = new EventEmitter<void>();
  onsiteSetupIdSelected = input.required<string>();
  @Input() scannedCode: BehaviorSubject<string | null> = new BehaviorSubject<string | null>(null);
  @Input() enablePromoCodesTracking = false;

  constructor() {
    effect(() => {
      const onsiteSetupId = this.onsiteSetupIdSelected();
      untracked(() => this.#store.loadPresetsForOnsiteSetup(onsiteSetupId));
    });

    effect(() => {
      const selection = this.#store.presetCouponSelection();
      if (selection == null || selection.nonce === this.#lastPresetSelectionNonce) {
        return;
      }

      this.#lastPresetSelectionNonce = selection.nonce;
      untracked(() => {
        this.#trackPromoCodesInteraction('preselected');
        this.couponCode.emit({ code: selection.code, lazyCouponType: null });
      });
    });

    effect(() => {
      const searchInteractionNonce = this.#store.searchInteractionNonce();
      if (searchInteractionNonce === this.#lastSearchInteractionNonce) {
        return;
      }

      this.#lastSearchInteractionNonce = searchInteractionNonce;
      untracked(() => this.#trackPromoCodesInteraction('search'));
    });
  }

  ngOnInit(): void {
    this.couponCodeApplied$.pipe(takeUntilDestroyed(this.#destroyRef)).subscribe((isCouponApplied: boolean) => {
      if (!isCouponApplied) {
        return;
      }

      this.#store.clearApplyingPreset();
      this.#closingAfterCouponApply = true;
      this.modalClosed.emit();
      this.#dialogRef?.close();
      this.#couponCodeDialogRef?.close();
    });
  }

  openModalCoupons(trackShowModal = true): void {
    if (trackShowModal) {
      this.#trackPromoCodesShowModal();
    }

    this.#dialogRef = this.#dialogService.openModal<CouponCodeSelectorModalResult>(CouponCodeSelectorModalComponent, {
      data: {
        error: this.error,
        scannedCode: this.scannedCode,
      },
      injector: this.#injector,
      size: 'sm',
    });
    if (this.enablePromoCodesTracking) {
      this.modalOpened.emit();
    }
    this.#dialogRef.closed$.pipe(take(1), takeUntilDestroyed(this.#destroyRef)).subscribe((result: CouponCodeSelectorModalResult) => {
      this.#resetError();
      this.#dialogRef = null;
      if (result == null) {
        this.#emitModalClosedUnlessCouponApply();
        return;
      }
      if (this.#isCouponCardEvent(result)) {
        this.#trackPromoCodesInteraction(result.isLazy ? 'lazy_coupon' : 'custom');
        this.#loadCouponCodeModal(result);
        return;
      }
      this.#emitModalClosedUnlessCouponApply();
    });
  }

  #emitModalClosedUnlessCouponApply(): void {
    if (this.#closingAfterCouponApply) {
      if (this.#dialogRef == null && this.#couponCodeDialogRef == null) {
        this.#closingAfterCouponApply = false;
      }
      return;
    }

    this.modalClosed.emit();
  }

  #getPromoCodesTrackingContext(): PosCheckoutPromoCodesShowModalData {
    return {
      availableLazyCouponTypes: this.#store.lazyCoupons().map(({ code }) => code),
      preselectedCouponCount: this.#store.presetCoupons().length,
      preselectedCoupons: this.#store.presetCoupons().map(({ code }) => code),
    };
  }

  #isCouponCardEvent(result: CouponCodeSelectorModalResult): result is CouponCardEvent {
    return result != null && typeof result === 'object' && 'isLazy' in result;
  }

  #loadCouponCodeModal(couponCardEvent: CouponCardEvent, inputCode?: string): void {
    this.#pendingCouponCardEvent = couponCardEvent;
    const { code, title } = couponCardEvent;
    this.#resetError();
    const couponCode$ = new Subject<CouponCodeEvent>();
    this.#couponCodeDialogRef = this.#dialogService.openModal<CouponCodeModalResult>(CouponCodeModalComponent, {
      data: {
        couponCode$,
        error: this.error,
        hasNavigation: true,
        inputCode,
        lazyCouponType: code,
        scannedCode: this.scannedCode,
        title,
      },
      size: 'sm',
    });
    if (this.enablePromoCodesTracking) {
      this.modalOpened.emit();
    }
    couponCode$.pipe(takeUntilDestroyed(this.#destroyRef)).subscribe((couponCodeEvent: CouponCodeEvent) => {
      this.couponCode.emit(couponCodeEvent);
    });
    this.#couponCodeDialogRef.closed$.pipe(take(1), takeUntilDestroyed(this.#destroyRef)).subscribe((result: CouponCodeModalResult) => {
      this.#couponCodeDialogRef = null;
      this.#resetError();
      if (result === 'Back click') {
        this.#pendingCouponCardEvent = null;
        this.openModalCoupons(false);
        return;
      }
      if (result === 'Open scanner') {
        this.#openScannerAndReturnToCouponModal();
        return;
      }
      this.#pendingCouponCardEvent = null;
      this.#emitModalClosedUnlessCouponApply();
    });
  }

  #openScannerAndReturnToCouponModal(): void {
    const pendingCouponCardEvent = this.#pendingCouponCardEvent;
    if (pendingCouponCardEvent == null) {
      this.modalClosed.emit();
      return;
    }

    this.#trackPromoCodesOpenManualScanner(pendingCouponCardEvent.isLazy ? 'lazy_coupon' : 'custom');
    const scannerRef = this.#dialogService.openModal<string>(ScannerComponent, { size: 'sm' });
    scannerRef.closed$.pipe(take(1), takeUntilDestroyed(this.#destroyRef)).subscribe((scannedValue: string | undefined) => {
      this.#loadCouponCodeModal(pendingCouponCardEvent, scannedValue);
    });
  }

  #resetError(): void {
    this.error.next(null);
  }

  #trackPromoCodesInteraction(interactionType: PosCheckoutPromoCodesInteractionType): void {
    if (!this.enablePromoCodesTracking) {
      return;
    }

    this.#fzTracking.track(
      posCheckoutPromoCodesInteraction({
        ...this.#getPromoCodesTrackingContext(),
        interactionType,
      }),
    );
  }

  #trackPromoCodesOpenManualScanner(source: PosCheckoutPromoCodesOpenManualScannerSource): void {
    if (!this.enablePromoCodesTracking) {
      return;
    }

    this.#fzTracking.track(posCheckoutPromoCodesOpenManualScanner({ source }));
  }

  #trackPromoCodesShowModal(): void {
    if (!this.enablePromoCodesTracking) {
      return;
    }

    this.#fzTracking.track(posCheckoutPromoCodesShowModal(this.#getPromoCodesTrackingContext()));
  }
}
