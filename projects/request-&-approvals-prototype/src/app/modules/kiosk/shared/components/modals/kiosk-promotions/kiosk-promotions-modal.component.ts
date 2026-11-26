import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, DestroyRef, inject, OnInit, signal, WritableSignal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormArray, FormBuilder, FormGroup } from '@angular/forms';

import { UserService } from '@fz-original/app/shared/services/user/user.service';
import { catchError, EMPTY, finalize } from 'rxjs';

import { BasePromotionsManagerService, PromotionResponse, PromotionValidate } from '../../../../services/promotions';
import { KioskBaseModal } from '../kiosk-base-modals.class';
import { PROMOTION_CODE_MAX_LENGTH_BY_PARTNER, PromotionCustom, PromotionModalConfig } from './models';

type PromotionsForm = FormGroup<{ promotions: FormArray<any> }>;

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-kiosk-promotions-modal',
  standalone: false,
  styleUrls: ['../kiosk-base-modals.styles.scss', './kiosk-promotions-modal.component.scss'],
  templateUrl: './kiosk-promotions-modal.component.html',
})
export class KioskPromotionsModalComponent extends KioskBaseModal implements OnInit {
  readonly #cdRef = inject(ChangeDetectorRef);
  readonly #data = inject<PromotionModalConfig>(DIALOG_DATA);
  readonly #destroyRef = inject(DestroyRef);
  readonly #dialogRef = inject(DialogRef<PromotionResponse[] | null>);
  readonly #fb = inject(FormBuilder);

  get canApply(): boolean {
    return this.form.valid && this.#getAllPromotionsWithCodes().length > 0 && !this.isLoading();
  }

  cartId!: string;
  form!: PromotionsForm;
  genericCodeMaxLength: number | null = null;
  isLoading: WritableSignal<boolean> = signal(false);
  isRequired = false;
  partnerId!: number;
  promotionsItems!: PromotionCustom[];
  promotionsServiceManager!: BasePromotionsManagerService;

  constructor() {
    super(inject(UserService));
  }

  applyPromotions(): void {
    if (this.isLoading()) return;

    const promotionsWithCodes = this.#getAllPromotionsWithCodes() ?? [];
    if (promotionsWithCodes.length === 0) {
      this.modalClose();
      return;
    }

    this.isLoading.set(true);
    this.promotionsServiceManager
      .validate(this.cartId, this.partnerId, promotionsWithCodes)
      .pipe(
        catchError(() => EMPTY),
        finalize(() => this.isLoading.set(false)),
      )
      .subscribe(promotionsValidate => {
        const isValid = this.#validatePromotions(promotionsValidate);
        if (isValid) {
          this.#dialogRef.close(promotionsWithCodes);
          return;
        }
      });
  }

  modalClose(): void {
    if (this.isRequired) return;
    this.#dialogRef.close(null);
  }

  ngOnInit(): void {
    this.cartId = this.#data.cartId;
    this.partnerId = this.#data.partnerId;
    this.genericCodeMaxLength = PROMOTION_CODE_MAX_LENGTH_BY_PARTNER[this.partnerId] ?? null;
    this.promotionsItems = this.#data.promotions;
    this.promotionsServiceManager = this.#data.promotionsServiceManager;
    this.isRequired = this.#data.isRequired;

    this.promotionsItems[0].isOpen = true;

    this.form = this.#fb.group({
      promotions: this.#fb.array([]),
    });

    this.form.controls?.promotions?.controls?.[0]?.valueChanges.pipe(takeUntilDestroyed(this.#destroyRef)).subscribe(() => {
      this.form.updateValueAndValidity();
    });
  }

  #getAllPromotionsWithCodes(): PromotionResponse[] {
    const promotionsValue: PromotionResponse[] = [];
    (this.form.value.promotions as []).forEach((promotion: PromotionResponse) => {
      if (promotion.code || promotion.username || promotion.password) {
        promotionsValue.push(promotion);
      }
    });

    return promotionsValue;
  }

  #invalidPromotionResponse(promotionResponse: PromotionValidate): void {
    const promotionIndex = this.form.controls.promotions.controls.findIndex(promotionForm => {
      if (!promotionResponse.promotion_id) {
        return !promotionForm.value['promotion_id'];
      }
      return promotionForm.value['promotion_id'] === promotionResponse.promotion_id;
    });
    if (promotionIndex !== -1) {
      const promotionFormGroup = this.form.controls.promotions.controls[promotionIndex] as FormGroup;

      promotionFormGroup.setErrors({ invalid: true });

      Object.keys(promotionFormGroup.controls).forEach(controlName => {
        const control = promotionFormGroup.get(controlName);
        if (control && controlName !== 'promotion_id') {
          control.setErrors({ invalid: true });
          control.markAsTouched();
          control.markAsDirty();
        }
      });

      const promotionItemIndex = this.promotionsItems.findIndex(promotion => {
        if (!promotionResponse.promotion_id) {
          return promotion.validation_method.type === 'promotional_code';
        }
        return promotion.id === promotionResponse.promotion_id;
      });

      if (promotionItemIndex !== -1) {
        this.promotionsItems[promotionItemIndex].isInvalid = true;
      }

      this.#cdRef.markForCheck();
    }
  }

  #validatePromotions(promotionsValidate: PromotionValidate[]): boolean {
    const isValidPromotions = promotionsValidate.every(promotion => promotion.valid);
    if (isValidPromotions) {
      return true;
    }

    this.promotionsItems.forEach(promotion => {
      promotion.isApplied = false;
      promotion.isInvalid = false;
    });

    promotionsValidate.forEach(promotionResponseValidate => {
      if (promotionResponseValidate.valid) {
        this.#validPromotionResponse(promotionResponseValidate);
      } else {
        this.#invalidPromotionResponse(promotionResponseValidate);
      }
    });

    return false;
  }

  #validPromotionResponse(promotionResponse: PromotionValidate): void {
    const promotionIndex = this.promotionsItems.findIndex(promotion => {
      if (!promotionResponse.promotion_id) {
        return promotion.validation_method.type === 'promotional_code';
      }

      return promotion.id === promotionResponse.promotion_id;
    });

    if (promotionIndex !== -1) {
      this.promotionsItems[promotionIndex].isApplied = true;
    }
  }
}
