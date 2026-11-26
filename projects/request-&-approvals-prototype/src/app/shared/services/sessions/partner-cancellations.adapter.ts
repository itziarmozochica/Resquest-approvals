import { Injectable } from '@angular/core';

import { BaseErrorResponse, BaseResponse } from '../../models/base-response';
import {
  CancellationDetail,
  CancellationDetailDTO,
  CancellationDetailTimeSlotDTO,
  JobRequestSummary,
  JobRequestSummaryDTO,
  JobSummaryDTO,
  PartnerCancellation,
  PartnerCancellationDTO,
  PartnerCancellations,
  PartnerCancellationsResponseDTO,
} from './partner-cancellations';

@Injectable({
  providedIn: 'root',
})
export class PartnerCancellationsAdapter {
  cancellationsFromApi(response: BaseResponse<PartnerCancellationsResponseDTO>): BaseResponse<PartnerCancellations> {
    return new BaseResponse<PartnerCancellations>(this.#getCancellations(response?.data), this.#getError(response?.error));
  }

  detailFromApi(response: BaseResponse<CancellationDetailDTO>): BaseResponse<CancellationDetail> {
    return new BaseResponse<CancellationDetail>(this.#getDetail(response?.data), this.#getError(response?.error));
  }

  #getCancellation(cancellation: PartnerCancellationDTO): PartnerCancellation {
    return {
      cancellationReason: cancellation.cancellation_reason,
      comments: cancellation.comments,
      compensationType: cancellation.compensation_type,
      id: cancellation.id,
      internalComments: cancellation.internal_comments,
      jobRequestId: cancellation.job_request_id,
      mainPlanId: cancellation.main_plan_id,
      orderCount: cancellation.order_count,
      placeId: cancellation.place_id,
      requestedAt: cancellation.requested_at,
      requesterEmail: cancellation.requester_email,
      requesterName: cancellation.requester_name,
      status: cancellation.status,
      ticketCount: cancellation.ticket_count,
    };
  }

  #getCancellations(data: PartnerCancellationsResponseDTO | null): PartnerCancellations | null {
    if (data == null) {
      return null;
    }
    return {
      cancellations: (data.cancellations ?? []).map(cancellation => this.#getCancellation(cancellation)),
      totalCount: data.total_count ?? 0,
    };
  }

  #getDetail(data: CancellationDetailDTO | null): CancellationDetail | null {
    if (data == null) {
      return null;
    }
    return {
      cancellationReason: data.cancellation_reason,
      cancelledAt: data.cancelled_at,
      comments: data.comments,
      compensationType: data.compensation_type,
      internalComments: data.internal_comments,
      jobSummary: this.#getJobRequestSummary(data.job_summary),
      requesterEmail: data.requester_email,
      requesterName: data.requester_name,
      timeSlots: (data.time_slots ?? []).map(timeSlot => this.#getDetailTimeSlot(timeSlot)),
      totals: {
        addOnCount: data.totals.add_on_count,
        orderCount: data.totals.order_count,
        productTypesCount: data.totals.product_types_count,
        ticketCount: data.totals.ticket_count,
      },
    };
  }

  #getDetailTimeSlot(timeSlot: CancellationDetailTimeSlotDTO): CancellationDetail['timeSlots'][number] {
    return {
      addOnCount: timeSlot.add_on_count,
      breakdown: (timeSlot.breakdown ?? []).map(entry => ({
        productTypeName: entry.product_type_name,
        ticketCount: entry.ticket_count,
      })),
      orderCount: timeSlot.order_count,
      productTypesCount: timeSlot.product_types_count,
      startsAt: timeSlot.starts_at,
      ticketCount: timeSlot.ticket_count,
    };
  }

  #getError(error: BaseErrorResponse | null | undefined): BaseErrorResponse | null {
    if (error == null) {
      return null;
    }
    return { code: error.code, message: error.message };
  }

  #getJob(job: JobSummaryDTO): JobRequestSummary['jobs'][number] {
    return {
      canceledAt: job.canceled_at,
      createdAt: job.created_at,
      finishedAt: job.finished_at,
      id: job.id,
      progressPercentage: job.progress_percentage,
      startedAt: job.started_at,
      status: job.status,
      type: job.type,
    };
  }

  #getJobRequestSummary(data: JobRequestSummaryDTO | null): JobRequestSummary | null {
    if (data == null) {
      return null;
    }
    return {
      createdAt: data.created_at,
      id: data.id,
      jobs: (data.jobs ?? []).map(job => this.#getJob(job)),
      requesterEmail: data.requester_email,
      requesterFullName: data.requester_full_name,
      requestType: data.request_type,
    };
  }
}
