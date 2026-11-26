import { HttpResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';

import { BaseErrorResponse, BaseResponse } from '@fz-original/app/shared/models/base-response';

import { AdapterInterface } from '../../../../core/adapter.interface';
import { LinkPaginationResponse } from '../../../../shared/models/link-pagination-response';
import { User } from '../../../../shared/models/user/user.model';
import { PlanRequestDate, PlanRequestDateData } from '../models/plan-request-date/plan-request-date.model';
import { PlanRequestImage, PlanRequestImageData } from '../models/plan-request-image/plan-request-image.model';
import { PlanRequestTicketType, PlanRequestTicketTypeData } from '../models/plan-request-ticket-type/plan-request-ticket-type.model';
import { PlanRequest, PlanRequestData } from '../models/plan-request/plan-request.model';

@Injectable({
  providedIn: 'root',
})
export class PlanRequestsAdapter implements AdapterInterface<LinkPaginationResponse<PlanRequest[]>> {
  fromApi(response: HttpResponse<BaseResponse<{ plan_requests: PlanRequestData[] }>>): LinkPaginationResponse<PlanRequest[]> {
    const body = response.body;
    return new LinkPaginationResponse<PlanRequest[]>(response.headers.get('Link'), this.getData(body?.data), this.getError(body?.error));
  }

  private getError(data: BaseErrorResponse | null | undefined) {
    if (data == null) {
      return null;
    }
    return { code: data.code, message: data.message };
  }

  private getData(data: { plan_requests: PlanRequestData[] } | null | undefined): PlanRequest[] | null {
    if (data == null || !data.plan_requests) {
      return null;
    }
    return data.plan_requests.map((plan_request: PlanRequestData) => {
      const ticketTypes: PlanRequestTicketType[] = plan_request.ticket_types.map((ticket_type: PlanRequestTicketTypeData) => {
        return new PlanRequestTicketType(
          ticket_type.type,
          ticket_type.price,
          ticket_type.available_tickets,
          ticket_type.weekdays_applies,
          ticket_type.sessions_hours,
          ticket_type.id,
          ticket_type.plan_request_id,
        );
      });
      const dates: PlanRequestDate[] = plan_request.dates.map((date: PlanRequestDateData) => {
        return new PlanRequestDate(date.starts_at, date.ends_at, date.id, date.plan_request_id);
      });
      const images: PlanRequestImage[] = plan_request.images.map((image: PlanRequestImageData) => {
        return new PlanRequestImage(image.image_url, image.id, image.plan_request_id);
      });
      return new PlanRequest(
        plan_request.status,
        plan_request.partner_id,
        ticketTypes,
        dates,
        images,
        plan_request.id,
        plan_request.created_at,
        plan_request.updated_at,
        plan_request.plan_id ?? undefined,
        plan_request.web_url ?? undefined,
        plan_request.plan_name,
        plan_request.plan_description ?? undefined,
        plan_request.city,
        plan_request.address,
        plan_request.accessibility,
        plan_request.surcharge_agreed ?? undefined,
        plan_request.closing_sales,
        plan_request.additional_information ?? undefined,
        plan_request.validation_method,
        plan_request.codes_type,
        plan_request.codes_validation,
        plan_request.codes_file_url ?? undefined,
        plan_request.faq ?? undefined,
        plan_request.terms_and_conditions ?? undefined,
        plan_request.b2b_user
          ? new User(
              plan_request.b2b_user.id,
              plan_request.b2b_user.email ?? undefined,
              undefined,
              plan_request.b2b_user.name ?? undefined,
              undefined,
              undefined,
              plan_request.b2b_user.username ?? undefined,
            )
          : undefined,
      );
    });
  }
}
