import { UpperCasePipe } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, DestroyRef, inject, OnInit, PipeTransform } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, FormControl, FormGroup, UntypedFormGroup, Validators } from '@angular/forms';

import { Promotion } from '../../../../../../services/promotions';
import { BasePromotionComponent } from '../base-promotion/base-promotion.component';

type inputPromoFormGroup = FormGroup<{ code: FormControl<string | null> }>;

@Component({
  selector: 'app-code-promotion',
  standalone: false,
  templateUrl: './code-promotion.component.html',
  styleUrls: ['./../form-promotions.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CodePromotionComponent extends BasePromotionComponent implements OnInit {
  readonly #cdRef = inject(ChangeDetectorRef);
  readonly #destroyRef = inject(DestroyRef);
  readonly #fb = inject(FormBuilder);
  promoFormGroup: inputPromoFormGroup | undefined;
  uppercasePipe: PipeTransform = new UpperCasePipe();

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
    const formCodeValidators = [Validators.nullValidator];
    if (promotion.required) {
      formCodeValidators.push(Validators.required);
    }
    return this.#fb.group({
      code: [null, formCodeValidators],
    });
  }
}
