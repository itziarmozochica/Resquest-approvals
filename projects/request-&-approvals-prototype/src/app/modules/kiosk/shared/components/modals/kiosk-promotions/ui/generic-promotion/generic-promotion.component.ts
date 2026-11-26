import { ChangeDetectionStrategy, ChangeDetectorRef, Component, DestroyRef, inject, Input, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, FormControl, FormGroup, UntypedFormGroup, ValidatorFn, Validators } from '@angular/forms';

import { Promotion } from '../../../../../../services/promotions';
import { BasePromotionComponent } from '../base-promotion/base-promotion.component';

type inputPromoFormGroup = FormGroup<{
  code: FormControl<string | null>;
  promotion_id: FormControl<number | null>;
}>;

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-generic-promotion',
  standalone: false,
  styleUrls: ['./../form-promotions.scss'],
  templateUrl: './generic-promotion.component.html',
})
export class GenericPromotionComponent extends BasePromotionComponent implements OnInit {
  readonly #cdRef = inject(ChangeDetectorRef);
  readonly #destroyRef = inject(DestroyRef);
  readonly #fb = inject(FormBuilder);
  @Input() codeMaxLength: number | null = null;
  promoFormGroup: inputPromoFormGroup | undefined;

  constructor() {
    super();
  }

  override addPromoToForm(): void {
    this.formArray.push(this.promoFormGroup);
  }

  ngOnInit(): void {
    this.promoFormGroup = this.#createPromotionFormGroup(this.promotion);
    this.addPromoToForm();
    this.promoFormGroup.statusChanges.pipe(takeUntilDestroyed(this.#destroyRef)).subscribe(() => {
      this.#cdRef.markForCheck();
    });
  }

  #createPromotionFormGroup(promotion: Promotion): UntypedFormGroup {
    const formCodeValidators: ValidatorFn[] = [Validators.nullValidator];
    if (promotion.required) {
      formCodeValidators.push(Validators.required);
    }
    if (this.codeMaxLength !== null) {
      formCodeValidators.push(Validators.maxLength(this.codeMaxLength));
    }

    return this.#fb.group({ promotion_id: [promotion.id], code: [null, formCodeValidators] });
  }
}
