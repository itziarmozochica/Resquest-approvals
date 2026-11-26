import { Component, Input } from '@angular/core';

import { Money } from '../../../../../shared/models/money.model';
import { OrderPaymentMethod } from '../../../../../shared/models/order/payment-method.enum';
import { isNumber } from '../../../../../shared/utils/number.util';
import { CashRegister, PaymentMethodSummary, Shift, ShiftStatus } from '../../../shared/models/shifts.model';

enum CashSummaryEntry {
  initial = 'initial',
  final = 'final',
  expected = 'expected',
}

type CashSummaryRow = {
  key: CashSummaryEntry;
  value: Money;
};

@Component({
  selector: 'app-shift-cash-summary',
  standalone: false,
  templateUrl: './shift-cash-summary.component.html',
  styleUrls: ['./shift-cash-summary.component.scss'],
})
export class ShiftCashSummaryComponent {
  protected readonly isNumber = isNumber;

  cashSummaryRows: Array<CashSummaryRow> = [];
  leftOver: Money;
  showLeftOverAlert = false;

  @Input() set shift(input: Shift) {
    this.updateViewData(input);
  }

  trackByKey(_: number, row: CashSummaryRow): string {
    return row.key;
  }

  private updateViewData(shift: Shift): void {
    const values = this.calculateSummaryRows(shift);
    const order: Array<string> = [CashSummaryEntry.initial, CashSummaryEntry.expected, CashSummaryEntry.final];

    this.cashSummaryRows = Object.entries(values)
      .sort(([a], [b]) => order.indexOf(a) - order.indexOf(b))
      .map(([key, value]) => ({ key, value }) as CashSummaryRow);

    const { expected, final } = values;
    if (expected.amount !== final.amount) {
      this.leftOver = new Money(final.amount - expected.amount, final.currency);
      this.showLeftOverAlert = shift.status === ShiftStatus.closed;
    }
  }

  private calculateSummaryRows(shift: Shift): Record<CashSummaryEntry, Money> {
    const initial = this.getMoneyTotal(shift.cashRegisters, 'initialAmount');
    const final = this.getMoneyTotal(shift.cashRegisters, 'finalAmount');

    const cashAmount = this.getCashAmount(shift.paymentMethodSummaries) ?? new Money(0, initial.currency);
    const expected = new Money(cashAmount.amount + initial.amount, initial.currency);

    return { initial, final, expected };
  }

  private getCashAmount(paymentSummaries: Array<PaymentMethodSummary>): Money {
    const cashSummary = paymentSummaries.find(summary => summary.paymentMethod === OrderPaymentMethod.CASH);

    return cashSummary?.total;
  }

  private getMoneyTotal(cashRegisters: Array<CashRegister>, key: keyof Pick<CashRegister, 'initialAmount' | 'finalAmount'>): Money {
    return cashRegisters.reduce(
      (prev, curr) => {
        return new Money(prev.amount + curr[key], curr.currency);
      },
      new Money(0, ''),
    );
  }
}
