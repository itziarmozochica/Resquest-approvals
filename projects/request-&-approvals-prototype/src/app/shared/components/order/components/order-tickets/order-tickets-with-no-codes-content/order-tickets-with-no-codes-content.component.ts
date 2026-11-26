import { Component, EventEmitter, input, Input, OnChanges, Output, SimpleChanges } from '@angular/core';

import { ValidationStatus } from '../../../../../../modules/validation/enums/validation-status.enum';
import { CartSession } from '../../../../../models/cart/cart-session.model';
import { Money } from '../../../../../models/money.model';
import { isNonZeroNumber } from '../../../../../utils/number.util';

@Component({
  selector: 'app-order-tickets-with-no-codes-content',
  standalone: false,
  styleUrl: './order-tickets-with-no-codes-content.component.scss',
  templateUrl: './order-tickets-with-no-codes-content.component.html',
})
export class OrderTicketsWithNoCodesContentComponent implements OnChanges {
  @Input() hiddenValidation = false;
  @Input({ required: true }) session!: CartSession;
  @Input() selectMaxCountAvailable = false;
  @Input() forceDisabled = false;
  readonly partnerSharePrice = input<Money | null>(null);
  @Output() selectedCount = new EventEmitter<number>();

  locale: string | null = null;
  pendingValidationCount = 0;
  validationStatusEnum = ValidationStatus;

  addToValidationCount(amount: number): void {
    if (!this.canAddToPendingValidationCount(amount) || this.forceDisabled) {
      return;
    }

    this.setPendingValidationCount(this.pendingValidationCount + amount);
  }

  canAddToPendingValidationCount(amount: number): boolean {
    const count = this.pendingValidationCount + amount;
    const validatedCount = this.session.validatedCount ?? 0;
    return this.session.status !== ValidationStatus.CANCELLED && count >= 0 && count + validatedCount <= this.session.units;
  }

  getPendingValidationStatusString(): string {
    const validatedCount = this.session.validatedCount ?? 0;
    return `${validatedCount + this.pendingValidationCount}/${this.session.units}`;
  }

  shouldShowLoyaltyPrice(): boolean {
    return isNonZeroNumber(this.session.loyaltyTotalPrice);
  }

  ngOnChanges({ selectMaxCountAvailable, session }: SimpleChanges): void {
    if (
      selectMaxCountAvailable &&
      selectMaxCountAvailable.previousValue === false &&
      selectMaxCountAvailable.currentValue === true &&
      this.session.status !== ValidationStatus.CANCELLED
    ) {
      this.pendingValidationCount = this.session.units;
      this.setPendingValidationCount(this.session.units);
    }

    if (session?.currentValue && session?.previousValue !== undefined) {
      this.pendingValidationCount = 0;
      this.selectedCount.emit(0);
    }
  }

  private setPendingValidationCount(pendingValidationCount: number): void {
    this.pendingValidationCount = pendingValidationCount;
    this.selectedCount.emit(this.pendingValidationCount);
  }
}
