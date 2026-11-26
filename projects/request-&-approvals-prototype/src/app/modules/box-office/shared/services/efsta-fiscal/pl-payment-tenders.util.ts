import { PaymentsStatus } from '@fz-original/app/payments/models/payments.model';

import { PlPaymentTender } from './efsta-esr-mapper-pl.util';

const SETTLED_SPLIT_STATUS = 'success';

export function toPlPaymentTenders(paymentsStatus: PaymentsStatus): readonly PlPaymentTender[] | undefined {
  const settledSplits = paymentsStatus.splits.filter(split => split.status === SETTLED_SPLIT_STATUS);
  if (settledSplits.length === 0) {
    return undefined;
  }

  return settledSplits.map(split => ({
    amount: split.amount,
    gateway: split.gateway,
    method: split.paymentMethod,
  }));
}
