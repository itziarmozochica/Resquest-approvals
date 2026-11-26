export interface PartnerCancellationDTO {
  cancellation_reason: string;
  comments: string;
  compensation_type: string;
  id: string;
  internal_comments: string;
  job_request_id: string | null;
  main_plan_id: number;
  order_count: number | null;
  place_id: number;
  requested_at: string;
  requester_email: string;
  requester_name: string;
  status: string;
  ticket_count: number | null;
}

export interface PartnerCancellationsResponseDTO {
  cancellations: PartnerCancellationDTO[];
  total_count: number;
}

export interface PartnerCancellation {
  cancellationReason: string;
  comments: string;
  compensationType: string;
  id: string;
  internalComments: string;
  jobRequestId: string | null;
  mainPlanId: number;
  orderCount: number | null;
  placeId: number;
  requestedAt: string;
  requesterEmail: string;
  requesterName: string;
  status: string;
  ticketCount: number | null;
}

export interface PartnerCancellations {
  cancellations: PartnerCancellation[];
  totalCount: number;
}

export interface JobSummaryDTO {
  canceled_at: string | null;
  created_at: string;
  finished_at: string | null;
  id: string;
  progress_percentage: number;
  started_at: string | null;
  status: string;
  type: string;
}

export interface JobRequestSummaryDTO {
  created_at: string;
  id: string;
  jobs: JobSummaryDTO[];
  request_type: string;
  requester_email: string | null;
  requester_full_name: string | null;
}

export interface JobSummary {
  canceledAt: string | null;
  createdAt: string;
  finishedAt: string | null;
  id: string;
  progressPercentage: number;
  startedAt: string | null;
  status: string;
  type: string;
}

export interface JobRequestSummary {
  createdAt: string;
  id: string;
  jobs: JobSummary[];
  requesterEmail: string | null;
  requesterFullName: string | null;
  requestType: string;
}

export interface ProductTypeBreakdownDTO {
  product_type_name: string;
  ticket_count: number;
}

export interface CancellationDetailTimeSlotDTO {
  add_on_count: number | null;
  breakdown: ProductTypeBreakdownDTO[];
  order_count: number | null;
  product_types_count: number | null;
  starts_at: string | null;
  ticket_count: number | null;
}

export interface CancellationDetailTotalsDTO {
  add_on_count: number | null;
  order_count: number | null;
  product_types_count: number | null;
  ticket_count: number | null;
}

export interface CancellationDetailDTO {
  cancellation_reason: string;
  cancelled_at: string;
  comments: string;
  compensation_type: string;
  internal_comments: string;
  job_summary: JobRequestSummaryDTO | null;
  requester_email: string;
  requester_name: string;
  time_slots: CancellationDetailTimeSlotDTO[];
  totals: CancellationDetailTotalsDTO;
}

export interface ProductTypeBreakdown {
  productTypeName: string;
  ticketCount: number;
}

export interface CancellationDetailTimeSlot {
  addOnCount: number | null;
  breakdown: ProductTypeBreakdown[];
  orderCount: number | null;
  productTypesCount: number | null;
  startsAt: string | null;
  ticketCount: number | null;
}

export interface CancellationDetailTotals {
  addOnCount: number | null;
  orderCount: number | null;
  productTypesCount: number | null;
  ticketCount: number | null;
}

export interface CancellationDetail {
  cancellationReason: string;
  cancelledAt: string;
  comments: string;
  compensationType: string;
  internalComments: string;
  jobSummary: JobRequestSummary | null;
  requesterEmail: string;
  requesterName: string;
  timeSlots: CancellationDetailTimeSlot[];
  totals: CancellationDetailTotals;
}
