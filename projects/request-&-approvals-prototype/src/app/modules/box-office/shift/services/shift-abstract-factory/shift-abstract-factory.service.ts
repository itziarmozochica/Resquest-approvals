import { Injectable, Injector, Type } from '@angular/core';

import { Observable } from 'rxjs';

import { ExportTypeEnum } from '../../../../../shared/components/export-list-button/export-option.model';
import { Money } from '../../../../../shared/models/money.model';
import { OrderPaymentMethod } from '../../../../../shared/models/order/payment-method.enum';
import { UserService } from '../../../../../shared/services/user/user.service';
import { CashRegister, PaymentMethodSummary, Shift } from '../../../shared/models/shifts.model';
import { ShiftTransactionsQuery } from '../../models/shift-transactions-query';
import { GetShiftTransactionsResponse } from './shared/shift-transactions.adapter';
import { ShiftSummaryService } from './shift-summary/shift-summary.service';
import { ShiftTransactionsService } from './shift-transactions/shift-transactions.service';
import { UserShiftSummaryService } from './user-shift-summary/user-shift-summary.service';
import { UserShiftTransactionsService } from './user-shift-transactions/user-shift-transactions.service';

export interface ShiftSummaryProvider {
  getShift(placeId: number, shiftId: string): Observable<Shift>;

  getShift(placeId: number, shiftId: string, fileType: ExportTypeEnum, language: string): Observable<Blob>;

  addShiftNotes(placeId: number, shiftId: string, notes: string): Observable<any>;
}

export interface ShiftTransactionsProvider {
  getTransactions(placeId: number, shiftId: string, query: ShiftTransactionsQuery): Observable<GetShiftTransactionsResponse>;

  downloadTransactions(placeId: number, shiftId: string, fileType: ExportTypeEnum): Observable<Blob>;
}

export enum CashSummaryEntry {
  initial = 'initial',
  final = 'final',
  expected = 'expected',
}

@Injectable({
  providedIn: 'root',
})
export class ShiftAbstractFactoryService {
  constructor(
    private userService: UserService,
    private injector: Injector,
  ) {}

  getShiftSummaryProvider(): ShiftSummaryProvider {
    const providerClass: Type<ShiftSummaryProvider> = this.canViewAllShifts() ? ShiftSummaryService : UserShiftSummaryService;
    return this.injector.get(providerClass);
  }

  getShiftTransactionsProvider(): ShiftTransactionsProvider {
    const providerClass: Type<ShiftTransactionsProvider> = this.canViewAllShifts()
      ? ShiftTransactionsService
      : UserShiftTransactionsService;
    return this.injector.get(providerClass);
  }

  private canViewAllShifts(): boolean {
    return this.userService.hasPermission('can_view_shifts');
  }

  getLeftOver(shift: Shift): Money | null {
    const values = this.calculateSummaryRows(shift);
    const { expected, final } = values;
    return new Money(final.amount - expected.amount, final.currency);
  }

  calculateSummaryRows(shift: Shift): Record<CashSummaryEntry, Money> {
    const initial = this.getMoneyTotal(shift.cashRegisters, 'initialAmount');
    const final = this.getMoneyTotal(shift.cashRegisters, 'finalAmount') ?? initial;

    const cashAmount = this.getCashAmount(shift.paymentMethodSummaries) ?? new Money(0, initial.currency);
    const expected = new Money(cashAmount.amount + initial.amount, initial.currency);

    return { initial, final, expected };
  }

  private getCashAmount(paymentSummaries: Array<PaymentMethodSummary>): Money | undefined {
    const cashSummary = paymentSummaries.find(summary => summary.paymentMethod === OrderPaymentMethod.CASH);

    return cashSummary?.total;
  }

  private getMoneyTotal(cashRegisters: Array<CashRegister>, key: keyof Pick<CashRegister, 'initialAmount' | 'finalAmount'>): Money {
    return cashRegisters.reduce(
      (prev, curr) => {
        const amount = curr[key] ?? 0;
        return new Money(prev.amount + amount, curr.currency);
      },
      new Money(0, ''),
    );
  }
}
