import { CommonModule, CurrencyPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

import { Deposit } from '@fz-original/app/shared/models/deposit/deposit.model';
import { IgntAlertComponent } from '@ignite/common';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, CurrencyPipe, IgntAlertComponent, TranslateModule],
  selector: 'app-deposit-refunded-card',
  standalone: true,
  styleUrls: ['./deposit-refunded-card.component.scss'],
  templateUrl: './deposit-refunded-card.component.html',
})
export class DepositRefundedCardComponent {
  get depositAmount(): number | undefined {
    return this.deposit.calculatedAmount?.amount;
  }

  get depositCurrency(): string | undefined {
    return this.currency ?? this.deposit.calculatedAmount?.currency;
  }

  @Input() currency: string | null = null;

  @Input({ required: true }) deposit!: Deposit;

  get paymentDate(): string | null {
    return this.deposit.paidAt || null;
  }

  get refundDate(): string | null {
    return this.deposit.refundedAt || null;
  }
}
