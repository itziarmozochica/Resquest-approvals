import { Injectable } from '@angular/core';

import { Deposit, DepositData } from '../../models/deposit/deposit.model';
import { Money } from '../../models/money.model';

@Injectable({
  providedIn: 'root',
})
export class DepositAdapter {
  fromApi(data: DepositData | undefined | null, currency: string): Deposit | undefined {
    if (data == null) {
      return undefined;
    }
    return {
      calculatedAmount: data.calculated_amount != null ? new Money(data.calculated_amount, currency) : undefined,
      effectiveTotal: data.effective_total != null ? new Money(data.effective_total.amount, data.effective_total.currency) : undefined,
      expirationDate: data.expires_at ?? undefined,
      hasPaidDeposit: data.has_paid_deposit ?? undefined,
      id: data.id ?? undefined,
      isMarkAsPaidPayment: data.is_mark_as_paid_payment ?? undefined,
      isRefundable: data.is_refundable ?? undefined,
      paidAt: data.paid_at ?? undefined,
      paymentGateway: data.payment_gateway ?? undefined,
      paymentMethod: data.payment_method ?? undefined,
      refundedAt: data.refunded_at ?? undefined,
      status: data.status ?? undefined,
      termsAndConditionsUrl: data.terms_and_conditions_url ?? undefined,
      warningMessage: data.warning_message ?? undefined,
    };
  }
}
