import { Dialog } from '@angular/cdk/dialog';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  EventEmitter,
  inject,
  Input,
  OnInit,
  Output,
  signal,
  Signal,
  WritableSignal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { Money } from '@fz-original/app/shared/models/money.model';
import { finalize } from 'rxjs/operators';

import { KioskLanguageService } from '../../services/kiosk-language.service';
import { KioskPromotionsManagerService } from '../../services/promotions/kiosk-promotions-manager.service';
import { Promotion, PromotionAppliedResponse, PromotionResponse, PromotionsResult } from '../../services/promotions/models/promotion.model';
import { KioskPromotionsModalComponent, PromotionModalConfig } from '../../shared/components/modals/kiosk-promotions';

const MODAL_WIDTH = '880px';

@Component({
  selector: 'app-kiosk-promotions',
  standalone: false,
  templateUrl: './promotions.component.html',
  styleUrls: ['./promotions.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PromotionsComponent implements OnInit {
  #destroyRef = inject(DestroyRef);
  #dialog = inject(Dialog);
  readonly #kioskLanguageService = inject(KioskLanguageService);
  #promotionsManagerService = inject(KioskPromotionsManagerService);

  @Input() cartId!: string;
  @Input() discount: Money | null = null;
  isLoading: WritableSignal<boolean> = signal<boolean>(false);
  @Input() isValidatingCoupon = false;
  locale: Signal<string> = this.#kioskLanguageService.locale;
  @Input() partnerId!: number;
  @Output() promotionApplied = new EventEmitter<string>();
  @Output() promotionRemoved = new EventEmitter<void>();
  promotions: WritableSignal<Promotion[]> = signal<Promotion[]>([]);
  showPromotionsButton: WritableSignal<boolean> = signal<boolean>(true);
  showPromotionsError: WritableSignal<boolean> = signal<boolean>(false);

  isLoadingPromotion(): boolean {
    return this.isLoading() || this.isValidatingCoupon;
  }

  ngOnInit(): void {
    this.#loadAvailablePromotions();
  }

  openPromotions(): void {
    if (this.promotions().length === 0) return;
    this.showPromotionsError.set(false);

    const data: PromotionModalConfig = {
      cartId: this.cartId,
      isRequired: this.#hasRequiredPromotions(),
      partnerId: this.partnerId,
      promotions: this.promotions(),
      promotionsServiceManager: this.#promotionsManagerService,
    };

    const dialogRef = this.#dialog.open<PromotionResponse[] | null, PromotionModalConfig>(KioskPromotionsModalComponent, {
      disableClose: data.isRequired,
      data,
      width: MODAL_WIDTH,
    });

    dialogRef.closed.pipe(takeUntilDestroyed(this.#destroyRef)).subscribe({
      next: (result: PromotionResponse[] | null | undefined) => {
        if (result && result.length > 0) {
          this.#applyPromotions(result);
        }
      },
    });
  }

  removePromotions(): void {
    this.showPromotionsButton.set(true);
    this.promotionRemoved.emit();
  }

  #applyPromotions(promotions: PromotionResponse[]): void {
    this.isLoading.set(true);
    this.#promotionsManagerService
      .post(this.cartId, this.partnerId, promotions)
      .pipe(
        finalize(() => this.isLoading.set(false)),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe({
        next: (result: PromotionAppliedResponse) => {
          if (result.coupon) {
            this.showPromotionsButton.set(false);
            this.promotionApplied.emit(result.coupon);
          } else {
            this.showPromotionsError.set(true);
          }
        },
        error: () => this.showPromotionsError.set(true),
      });
  }

  #hasRequiredPromotions(): boolean {
    return this.promotions().some((promo: Promotion) => promo.required);
  }

  #loadAvailablePromotions(): void {
    this.isLoading.set(true);
    this.#promotionsManagerService
      .get(this.cartId, this.partnerId)
      .pipe(
        finalize(() => this.isLoading.set(false)),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe({
        next: (result: PromotionsResult) => this.promotions.set(result.promotions || []),
        error: () => this.promotions.set([]),
      });
  }
}
