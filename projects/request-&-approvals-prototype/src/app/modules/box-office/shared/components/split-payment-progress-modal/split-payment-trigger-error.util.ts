import {
  findBookingFailureCode,
  resolvePaymentFailureMessageKey,
} from '@fz-original/app/modules/checkout/checkout-modal/utils/checkout-payment-failure.util';

export type TriggerErrorBody = { data?: null; error?: string | { code?: number | string; message?: string } } | null;

const collectorMismatchBeforeChargeCode = '31010108';
const collectorMismatchBeforeChargeMessageKey = 'boxOffice.waitPaymentModal.collectorMismatchBeforeCharge';

export function getTriggerErrorMessageKey(body: TriggerErrorBody | undefined): string | undefined {
  const code = findBookingFailureCode(body);
  if (code === undefined) {
    return undefined;
  }
  return code === collectorMismatchBeforeChargeCode ? collectorMismatchBeforeChargeMessageKey : resolvePaymentFailureMessageKey(code);
}

export function getTriggerErrorMessage(body: TriggerErrorBody | undefined): string | undefined {
  const error = body?.error;
  if (typeof error === 'string') {
    return error;
  }
  return typeof error?.message === 'string' ? error.message : undefined;
}
