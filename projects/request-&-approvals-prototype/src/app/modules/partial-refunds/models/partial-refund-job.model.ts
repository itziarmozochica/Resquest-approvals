import type { PartialRefundPreviewRequest, PartialRefundPreviewRequestDTO } from './partial-refund-preview.model';
import type { PartialRefundReason } from './partial-refund-reason.model';

/**
 * The same selection the preview accepts, plus the reason. Queueing what was previewed is the whole
 * point: an agent confirms the figures they were shown, so the two bodies may not drift apart.
 */
export interface PartialRefundJobRequestDTO extends PartialRefundPreviewRequestDTO {
  reason: PartialRefundReason;
}

export interface PartialRefundJobRequest extends PartialRefundPreviewRequest {
  readonly reason: PartialRefundReason;
}

export interface PartialRefundJobDTO {
  job_id: string;
}

/**
 * Everything the agent gets back. Fever2 queues one item per matched order and answers immediately,
 * so the id is a receipt for work that has not happened yet, not a result.
 */
export interface PartialRefundJob {
  readonly jobId: string;
}
