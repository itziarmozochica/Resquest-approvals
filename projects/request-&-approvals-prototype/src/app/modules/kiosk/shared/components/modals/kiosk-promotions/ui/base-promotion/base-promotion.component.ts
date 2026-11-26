import { Component, Input } from '@angular/core';
import { FormArray } from '@angular/forms';

import { Promotion } from '../../../../../../services/promotions';

@Component({
  standalone: false,
  template: '',
})
export abstract class BasePromotionComponent {
  @Input() formArray!: FormArray;
  @Input() isApplied: boolean | undefined = undefined;
  @Input() isInvalid = false;
  @Input() isOpen = false;
  @Input() promotion!: Promotion;

  abstract addPromoToForm(): void;

  onChangeInput(): void {
    this.isApplied = false;
    this.isInvalid = false;
  }
}
