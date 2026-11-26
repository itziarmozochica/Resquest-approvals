import type {
  PartialRefundPreview,
  PartialRefundPreviewDTO,
  PartialRefundPreviewItem,
  PartialRefundPreviewItemDTO,
  PartialRefundPreviewRow,
  PartialRefundPreviewRowDTO,
  PartialRefundPreviewSection,
  PartialRefundPreviewSectionDTO,
  PartialRefundPreviewTotals,
  PartialRefundPreviewTotalsDTO,
} from '../models/partial-refund-preview.model';
import type {
  PartialRefundRejectedOrder,
  PartialRefundRejectedOrderDTO,
  PartialRefundRejection,
  PartialRefundRejectionDTO,
} from '../models/partial-refund-rejection.model';

export function adaptPartialRefundPreview(dto: PartialRefundPreviewDTO): PartialRefundPreview {
  return {
    items: dto.items.map(adaptItem),
    rejectedOrders: (dto.rejected_orders ?? []).map(adaptRejectedOrder),
    rejections: dto.rejections.map(adaptRejection),
    sections: dto.sections.map(adaptSection),
    totalItems: dto.total_items,
  };
}

function adaptItem(dto: PartialRefundPreviewItemDTO): PartialRefundPreviewItem {
  return {
    alreadyRefundedAmount: dto.already_refunded_amount,
    currency: dto.currency,
    isCapped: dto.is_capped,
    orderId: dto.order_id,
    orderItemId: dto.order_item_id,
    refundableBase: dto.refundable_base,
    refundableBaseWithoutSurcharge: dto.refundable_base_without_surcharge,
    refundableBaseWithSurcharge: dto.refundable_base_with_surcharge,
    refundAmount: dto.refund_amount,
    remainingAmount: dto.remaining_amount,
    remainingAmountAfter: dto.remaining_amount_after,
    resolvedAmount: dto.resolved_amount,
    ticketTypeLabel: dto.ticket_type_label,
  };
}

function adaptRejection(dto: PartialRefundRejectionDTO): PartialRefundRejection {
  return {
    code: dto.code,
    ordersCount: dto.orders_count,
    ticketsCount: dto.tickets_count,
  };
}

function adaptRejectedOrder(dto: PartialRefundRejectedOrderDTO): PartialRefundRejectedOrder {
  return {
    orderId: dto.order_id,
    rejectionCodes: dto.rejection_codes,
    sessionIds: dto.session_ids,
    sessionTypeIds: dto.session_type_ids,
    ticketsCount: dto.tickets_count,
  };
}

function adaptRow(dto: PartialRefundPreviewRowDTO): PartialRefundPreviewRow {
  return {
    alreadyRefundedAmount: dto.already_refunded_amount,
    currency: dto.currency,
    isCapped: dto.is_capped,
    refundableBaseAmount: dto.refundable_base_amount,
    refundableBasePerTicket: dto.refundable_base_per_ticket,
    refundAmount: dto.refund_amount,
    refundAmountPerTicket: dto.refund_amount_per_ticket,
    remainingAmount: dto.remaining_amount,
    remainingAmountAfter: dto.remaining_amount_after,
    ticketsCount: dto.tickets_count,
    ticketTypeLabel: dto.ticket_type_label,
  };
}

function adaptSection(dto: PartialRefundPreviewSectionDTO): PartialRefundPreviewSection {
  return {
    currency: dto.currency,
    rows: dto.rows.map(adaptRow),
    totals: adaptTotals(dto.totals),
  };
}

function adaptTotals(dto: PartialRefundPreviewTotalsDTO): PartialRefundPreviewTotals {
  return {
    alreadyRefundedAmount: dto.already_refunded_amount,
    refundableBaseAmount: dto.refundable_base_amount,
    refundAmount: dto.refund_amount,
    remainingAmount: dto.remaining_amount,
    remainingAmountAfter: dto.remaining_amount_after,
    ticketsCount: dto.tickets_count,
  };
}
