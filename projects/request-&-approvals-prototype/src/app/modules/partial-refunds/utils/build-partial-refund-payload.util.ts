import { isOrderItemCriteria, type PartialRefundCriteria } from '../models/partial-refund-criteria.model';
import type { PartialRefundJobRequest, PartialRefundJobRequestDTO } from '../models/partial-refund-job.model';
import type { PartialRefundPreviewRequest, PartialRefundPreviewRequestDTO } from '../models/partial-refund-preview.model';

/**
 * The BFF takes the selection flat, not wrapped, and reads `value` as a decimal string so a money
 * amount cannot drift through a float. Both are its contract, and it forwards this body to fever2
 * as received.
 */
export function buildPreviewPayload(request: PartialRefundPreviewRequest): PartialRefundPreviewRequestDTO {
  return {
    double_refund_acknowledged: request.doubleRefundAcknowledged,
    include_surcharge: request.includeSurcharge,
    mode: request.mode,
    ...buildCriteriaPayload(request.criteria),
    value: String(request.value),
  };
}

function buildCriteriaPayload(criteria: PartialRefundCriteria): Pick<PartialRefundPreviewRequestDTO, 'order_item_ids' | 'session_ids'> {
  return isOrderItemCriteria(criteria) ? { order_item_ids: [...criteria.orderItemIds] } : { session_ids: [...criteria.sessionIds] };
}

/**
 * Composed on the preview body rather than rebuilt: the job must ask for exactly what was costed,
 * and a second copy of the field mapping is the way the two drift apart.
 */
export function buildJobPayload(request: PartialRefundJobRequest): PartialRefundJobRequestDTO {
  return { ...buildPreviewPayload(request), reason: request.reason };
}
