import { ChangeDetectionStrategy, Component, DestroyRef, inject, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, FormControl, FormGroup, UntypedFormGroup, Validators } from '@angular/forms';

import { Promotion } from '../../../../../../services/promotions';
import { BasePromotionComponent } from '../base-promotion/base-promotion.component';

type inputPromoFormGroup = FormGroup<{
  password: FormControl<string | null>;
  promotion_id: FormControl<number | null>;
  username: FormControl<string | null>;
}>;

@Component({
  selector: 'app-input-promotion',
  standalone: false,
  templateUrl: './input-promotion.component.html',
  styleUrls: ['./../form-promotions.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InputPromotionComponent extends BasePromotionComponent implements OnInit {
  readonly #destroyRef = inject(DestroyRef);
  readonly #fb = inject(FormBuilder);
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

    this.promoFormGroup
      .get('username')
      ?.valueChanges.pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe(() => {
        this.promoFormGroup?.get('password')?.updateValueAndValidity({ emitEvent: false });
      });

    this.promoFormGroup
      .get('password')
      ?.valueChanges.pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe(() => {
        this.promoFormGroup?.get('username')?.updateValueAndValidity({ emitEvent: false });
      });
  }

  #createPromotionFormGroup(promotion: Promotion): UntypedFormGroup {
    const formCodeValidators = [Validators.nullValidator];

    if (promotion.required) formCodeValidators.push(Validators.required);

    const form = this.#fb.group({
      promotion_id: [promotion.id],
      username: [null, formCodeValidators],
      password: [null, formCodeValidators],
    });

    form.get('username')?.addValidators(control => {
      const password = form.get('password')?.value;
      if (!password) return null;
      return control.value ? null : { required: true };
    });

    form.get('password')?.addValidators(control => {
      const username = form.get('username')?.value;
      if (!username) return null;
      return control.value ? null : { required: true };
    });

    return form;
  }
}
