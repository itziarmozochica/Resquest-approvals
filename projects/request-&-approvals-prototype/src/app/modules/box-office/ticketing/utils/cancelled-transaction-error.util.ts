import { AdyenErrorCode } from '@fz-original/app/app/enums/payment-checkout-adyen.enum';
import { RazorpayErrorCode } from '@fz-original/app/app/enums/payment-checkout-razorpay.enum';
import { BaseResponse } from '@fz-original/app/shared/models/base-response';

/**
 * True for the shared cancellation error shape every user-initiated checkout cancel unwinds the
 * purchase pipeline with (Adyen and Razorpay `CancelledTransaction`). Used to tell a cancellation
 * apart from a genuine payment failure — a checkout-modal cancellation is owned end to end by the
 * modal (B2BO-7939), so the legacy error/cancellation popups must never surface for it.
 */
export function isCancelledTransactionError(error: unknown): boolean {
  return (
    error instanceof BaseResponse &&
    (error.error?.errorCode === AdyenErrorCode.CancelledTransaction || error.error?.errorCode === RazorpayErrorCode.CancelledTransaction)
  );
}
