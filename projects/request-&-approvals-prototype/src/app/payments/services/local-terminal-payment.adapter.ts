import type { LocalTerminalCheckoutResultDto } from '../models/local-terminal-payment.dto';
import type { LocalTerminalPaymentResult } from '../models/local-terminal-payment.model';

const CANCELLED_ON_DEVICE_STATUS = 499;
const APPROVED_STATUS = 200;

/** NEXO's `POITransactionID` is `<terminal id>.<pspReference>`; the backend wants the pspReference. */
function pspReferenceOf(poiTransactionId: string): string {
  return poiTransactionId.slice(poiTransactionId.lastIndexOf('.') + 1);
}

export function fromLocalTerminalCheckoutResultDto(dto: LocalTerminalCheckoutResultDto): LocalTerminalPaymentResult {
  if (dto.status === CANCELLED_ON_DEVICE_STATUS) {
    return { kind: 'cancelled' };
  }
  if (dto.status !== APPROVED_STATUS) {
    return {
      kind: 'declined',
      ...(dto.errorCondition != null && { errorCondition: dto.errorCondition }),
      ...(dto.refusalReason != null && { refusalReason: dto.refusalReason }),
    };
  }
  const transaction = dto.data?.transaction ?? null;
  if (transaction === null) {
    return { kind: 'unknown' };
  }
  return {
    authorizedAmount: transaction.amount,
    currency: transaction.currencyCode,
    kind: 'approved',
    terminalReference: pspReferenceOf(transaction.transactionNumber),
  };
}
