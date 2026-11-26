import {
  cancellationInsuranceCancellationReason,
  cancellationInsuranceClaimCommentPattern,
  OrderUserCancellationRecord,
} from '@fz-original/app/shared/models/order/order-cancellation-record.model';
import { ReimbursementType } from '@fz-original/app/shared/models/order/reimbursement-type.enum';

export function isCoveredByCancellationInsurance(record: OrderUserCancellationRecord): boolean {
  return (
    record.cancellationReason === cancellationInsuranceCancellationReason &&
    (record.reimbursementType === ReimbursementType.NoRefund || record.reimbursementType === ReimbursementType.ManualRefund) &&
    record.refundedAmount === null &&
    record.refundedAt === null
  );
}

export function hasCancellationInsuranceComment(record: OrderUserCancellationRecord): boolean {
  const comment = record.comments.trim();

  return isCoveredByCancellationInsurance(record) && (comment.length === 0 || cancellationInsuranceClaimCommentPattern.test(comment));
}
