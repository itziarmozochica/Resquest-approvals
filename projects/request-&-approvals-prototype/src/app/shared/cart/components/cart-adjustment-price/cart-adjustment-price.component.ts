import { NgIf, NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, computed, inject, input, OnInit, output } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { ToggleOverrideModuleEvent } from '@fz-original/app/core/tracking/core/events/toggle-override-module';
import { TrackingService } from '@fz-original/app/core/tracking/tracking.service';
import { AutoformatNumericInputModule } from '@fz-original/app/shared/directives/autoformat-numeric-input/autoformat-numeric-input.module';
import { IconsModule } from '@fz-original/app/shared/icons/icons.module';
import { SelectOption } from '@fz-original/app/shared/layout/filters/select/select.interface';
import { IgntFieldErrorComponent } from '@ignite/legacy/components/ignt-field-error/ignt-field-error.component';
import { IgntListItemComponent } from '@ignite/legacy/components/ignt-list-item/ignt-list-item.component';
import { IgntRadioComponent } from '@ignite/legacy/components/ignt-radio/ignt-radio.component';
import { IgntTextareaFieldComponent } from '@ignite/legacy/components/ignt-textarea-field/ignt-textarea-field.component';
import { IgntToggleComponent } from '@ignite/legacy/components/ignt-toggle/ignt-toggle.component';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

import { IgntTypeaheadModule } from '../../../layout/filters/ignt-typeahead/ignt-typeahead.module';
import { MultiSelectModule } from '../../../layout/filters/multi-select/multi-select.module';
import {
  CartAdjustmentPrice,
  CartAdjustmentPriceCalculation,
  CartAdjustmentPriceOperation,
  CartAdjustmentPriceWithOperation,
} from '../../models/cart-adjustment-price.model';

@Component({
  selector: 'app-cart-adjustment-price',
  standalone: true,
  imports: [
    IgntListItemComponent,
    IgntToggleComponent,
    TranslateModule,
    IconsModule,
    NgIf,
    IgntRadioComponent,
    NgTemplateOutlet,
    FormsModule,
    IgntTypeaheadModule,
    MultiSelectModule,
    AutoformatNumericInputModule,
    IgntFieldErrorComponent,
    IgntTextareaFieldComponent,
  ],
  templateUrl: './cart-adjustment-price.component.html',
  styleUrls: ['./cart-adjustment-price.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CartAdjustmentPriceComponent implements OnInit {
  readonly #changeDetectorRef = inject(ChangeDetectorRef);
  readonly #translateService = inject(TranslateService);
  readonly #trackingService = inject(TrackingService);

  readonly initialAdjustment = input<CartAdjustmentPrice | null>(null);
  readonly canToggleAdjustmentPrice = input(false);
  readonly currency = input('');
  readonly errorKey = input<string | null>(null);
  readonly trackingScope = input<string>('recipient_details');
  readonly hasError = computed<boolean>(() => !!this.errorKey());
  readonly errorMessageKey = computed<string>(() => this.errorKey() ?? '');

  readonly adjustmentChange = output<CartAdjustmentPrice | null>();

  adjustmentPriceAmount: number | undefined;
  adjustmentPriceConcept: string | undefined;
  calculation: CartAdjustmentPriceCalculation = CartAdjustmentPriceCalculation.FIXED;
  cartAdjustmentPriceCalculationEnum = CartAdjustmentPriceCalculation;
  hasNewAdjustmentPrice = false;
  operation: SelectOption;
  operationOptions: SelectOption[] = [
    { title: this.#translateService.instant('cart.adjustment.reduce'), id: 'subtract' },
    { title: this.#translateService.instant('cart.adjustment.increase'), id: 'add' },
  ];

  constructor() {
    this.operation = this.operationOptions[0];
  }

  ngOnInit(): void {
    this.#hydrate(this.initialAdjustment());
  }

  reset(value: CartAdjustmentPrice | null = this.initialAdjustment()): void {
    this.#hydrate(value);
    this.#changeDetectorRef.detectChanges();
  }

  onAmountChange(): void {
    this.#emitDraft();
  }

  onCalculationChange(calculation: CartAdjustmentPriceCalculation): void {
    this.calculation = calculation;
    this.#emitDraft();
    this.#changeDetectorRef.detectChanges();
  }

  onConceptChange(): void {
    this.#emitDraft();
  }

  onOperationChange(event: SelectOption): void {
    this.operation = event;
    this.#emitDraft();
  }

  onToggleAdjustmentPrice(): void {
    this.hasNewAdjustmentPrice = !this.hasNewAdjustmentPrice;
    this.#trackingService.track(
      new ToggleOverrideModuleEvent({
        time: new Date().toISOString(),
        new_state: this.hasNewAdjustmentPrice,
        scope: this.trackingScope(),
      }),
    );
    this.#emitDraft();
  }

  #emitDraft(): void {
    if (typeof this.adjustmentPriceAmount === 'number' && isNaN(this.adjustmentPriceAmount)) {
      this.adjustmentPriceAmount = undefined;
    }
    this.adjustmentChange.emit(this.#buildDraftAdjustment());
  }

  #hydrate(value: CartAdjustmentPrice | null): void {
    this.adjustmentPriceAmount = value?.amount;
    this.adjustmentPriceConcept = value?.concept;
    this.calculation = (value?.calculation as CartAdjustmentPriceCalculation) || CartAdjustmentPriceCalculation.FIXED;
    this.hasNewAdjustmentPrice = !!value;
    const initialOperation = (value as CartAdjustmentPriceWithOperation | null)?.operation;
    this.operation = this.operationOptions.find(option => option.id === initialOperation) || this.operationOptions[0];
  }

  #buildDraftAdjustment(): CartAdjustmentPrice | null {
    if (!this.hasNewAdjustmentPrice) {
      return null;
    }
    return {
      amount: this.adjustmentPriceAmount ?? 0,
      calculation: this.calculation,
      operation: this.operation.id as CartAdjustmentPriceOperation,
      concept: this.adjustmentPriceConcept ?? '',
    };
  }
}
