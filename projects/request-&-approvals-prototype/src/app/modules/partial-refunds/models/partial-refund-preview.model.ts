import type { PartialRefundCriteria } from './partial-refund-criteria.model';
import type { PartialRefundMode } from './partial-refund-mode.model';
import type {
  PartialRefundRejectedOrder,
  PartialRefundRejectedOrderDTO,
  PartialRefundRejection,
  PartialRefundRejectionDTO,
} from './partial-refund-rejection.model';

export interface PartialRefundPreviewRequestDTO {
  double_refund_acknowledged: boolean;
  include_surcharge: boolean;
  mode: PartialRefundMode;
  value: string;
  /** Exactly one of the two is sent: fever2 rejects a body carrying both or neither. */
  order_item_ids?: number[];
  session_ids?: number[];
}

export interface PartialRefundPreviewRequest {
  readonly criteria: PartialRefundCriteria;
  readonly doubleRefundAcknowledged: boolean;
  readonly includeSurcharge: boolean;
  readonly mode: PartialRefundMode;
  readonly value: number;
}

export interface PartialRefundPreviewRowDTO {
  already_refunded_amount: number;
  currency: string;
  is_capped: boolean;
  refund_amount: number;
  refund_amount_per_ticket: number;
  refundable_base_amount: number;
  refundable_base_per_ticket: number;
  remaining_amount: number;
  remaining_amount_after: number;
  ticket_type_label: string;
  tickets_count: number;
}

/**
 * Amounts are rendered through the currency pipe and never recomputed, so the figures on screen are
 * always the engine's own. A row mixes two scales on purpose: the `PerTicket` pair is what one
 * ticket costs and returns, and every other amount is the total across the row's `ticketsCount`.
 */
export interface PartialRefundPreviewRow {
  readonly alreadyRefundedAmount: number;
  readonly currency: string;
  readonly isCapped: boolean;
  readonly refundableBaseAmount: number;
  readonly refundableBasePerTicket: number;
  readonly refundAmount: number;
  readonly refundAmountPerTicket: number;
  readonly remainingAmount: number;
  readonly remainingAmountAfter: number;
  readonly ticketsCount: number;
  readonly ticketTypeLabel: string;
}

export interface PartialRefundPreviewTotalsDTO {
  already_refunded_amount: number;
  refund_amount: number;
  refundable_base_amount: number;
  remaining_amount: number;
  remaining_amount_after: number;
  tickets_count: number;
}

export interface PartialRefundPreviewTotals {
  readonly alreadyRefundedAmount: number;
  readonly refundableBaseAmount: number;
  readonly refundAmount: number;
  readonly remainingAmount: number;
  readonly remainingAmountAfter: number;
  readonly ticketsCount: number;
}

export interface PartialRefundPreviewSectionDTO {
  currency: string;
  rows: PartialRefundPreviewRowDTO[];
  totals: PartialRefundPreviewTotalsDTO;
}

export interface PartialRefundPreviewSection {
  readonly currency: string;
  readonly rows: readonly PartialRefundPreviewRow[];
  readonly totals: PartialRefundPreviewTotals;
}

export interface PartialRefundPreviewItemDTO {
  already_refunded_amount: number;
  currency: string;
  is_capped: boolean;
  order_id: number;
  order_item_id: number;
  refund_amount: number;
  refundable_base: number;
  refundable_base_with_surcharge: number;
  refundable_base_without_surcharge: number;
  remaining_amount: number;
  remaining_amount_after: number;
  resolved_amount: number;
  ticket_type_label: string;
}

export interface PartialRefundPreviewItem {
  readonly alreadyRefundedAmount: number;
  readonly currency: string;
  readonly isCapped: boolean;
  readonly orderId: number;
  readonly orderItemId: number;
  readonly refundableBase: number;
  readonly refundableBaseWithoutSurcharge: number;
  readonly refundableBaseWithSurcharge: number;
  readonly refundAmount: number;
  readonly remainingAmount: number;
  readonly remainingAmountAfter: number;
  readonly resolvedAmount: number;
  readonly ticketTypeLabel: string;
}

export interface PartialRefundPreviewDTO {
  items: PartialRefundPreviewItemDTO[];
  rejections: PartialRefundRejectionDTO[];
  sections: PartialRefundPreviewSectionDTO[];
  total_items: number;
  rejected_orders?: PartialRefundRejectedOrderDTO[];
}

/** `items` is served only when the selection resolves to 100 order items or fewer, so bulk selections leave it empty and read `totalItems`. */
export interface PartialRefundPreview {
  readonly items: readonly PartialRefundPreviewItem[];
  /** Optional on the wire while the field rolls out, so an older engine reads as an empty list. */
  readonly rejectedOrders: readonly PartialRefundRejectedOrder[];
  readonly rejections: readonly PartialRefundRejection[];
  readonly sections: readonly PartialRefundPreviewSection[];
  readonly totalItems: number;
}
