import { ChangeDetectionStrategy, Component, DestroyRef, inject, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { CouponCardEvent } from '@fz-original/app/shared/components/coupon-card/coupon-card-event';
import { IGNT_DIALOG_DATA, IGNT_DIALOG_REF, IgntDialogModule, type IgntDialogRef } from '@ignite/common';
import { IgntIconComponent } from '@ignite/icon';
import { TranslateModule } from '@ngx-translate/core';

import { CouponCardComponent } from '../../coupon-card/coupon-card.component';
import { type CouponCodeSelectorModalData, type CouponCodeSelectorModalResult } from '../coupon-modals.model';
import { PresetCouponCodesComponent } from '../preset-coupon-codes/preset-coupon-codes.component';
import { CouponCodeSelectorStore } from '../store/coupon-code-selector.store';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'coupon-code-selector-modal',
  },
  imports: [CouponCardComponent, IgntDialogModule, IgntIconComponent, PresetCouponCodesComponent, TranslateModule],
  selector: 'app-coupon-code-selector-modal',
  standalone: true,
  styleUrls: ['./coupon-code-selector-modal.component.scss'],
  templateUrl: './coupon-code-selector-modal.component.html',
})
export class CouponCodeSelectorModalComponent implements OnInit {
  readonly #destroyRef = inject(DestroyRef);
  readonly #dialogData = inject<CouponCodeSelectorModalData>(IGNT_DIALOG_DATA);
  readonly #dialogRef = inject<IgntDialogRef<CouponCodeSelectorModalResult>>(IGNT_DIALOG_REF);
  readonly #store = inject(CouponCodeSelectorStore);

  isApplyingPreset = this.#store.isApplyingPreset;
  isLoadingPresets = this.#store.isLoadingPresets;
  lazyCoupons = this.#store.lazyCoupons;
  presetCoupons = this.#store.presetCoupons;
  protected readonly error = this.#dialogData.error;

  ngOnInit(): void {
    this.#dialogData.error.pipe(takeUntilDestroyed(this.#destroyRef)).subscribe((error: Error | null) => {
      if (error) {
        this.#store.clearApplyingPreset();
      }
    });
    this.#dialogData.scannedCode.pipe(takeUntilDestroyed(this.#destroyRef)).subscribe((code: string | null) => {
      if (code && !this.isApplyingPreset()) {
        this.onCardClicked({ title: 'Custom', code: '', isLazy: false });
      }
    });
  }

  onCardClicked(event: CouponCardEvent): void {
    if (this.isApplyingPreset()) {
      return;
    }

    this.#dialogRef.close(event);
  }

  onPresetCouponCode(code: string): void {
    this.#store.selectPresetCoupon(code);
  }

  onPresetSearchInteraction(): void {
    this.#store.notifySearchInteraction();
  }
}
