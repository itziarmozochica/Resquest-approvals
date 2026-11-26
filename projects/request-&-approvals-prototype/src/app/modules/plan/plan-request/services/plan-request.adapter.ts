import { Injectable } from '@angular/core';

import { AdapterInterface } from '../../../../core/adapter.interface';
import { BaseErrorResponse, BaseResponse } from '../../../../shared/models/base-response';
import { User } from '../../../../shared/models/user/user.model';
import { PlanRequestDate, PlanRequestDateData } from '../models/plan-request-date/plan-request-date.model';
import { PlanRequestImage } from '../models/plan-request-image/plan-request-image.model';
import { PlanRequestTicketType, PlanRequestTicketTypeData } from '../models/plan-request-ticket-type/plan-request-ticket-type.model';
import { PlanRequest, PlanRequestData } from '../models/plan-request/plan-request.model';

@Injectable({
  providedIn: 'root',
})
export class PlanRequestAdapter implements AdapterInterface<BaseResponse<PlanRequest>> {
  fromApi(response: BaseResponse<PlanRequestData>): BaseResponse<PlanRequest> {
    return new BaseResponse<PlanRequest>(this.getData(response.data), this.getError(response.error));
  }

  private getError(data: BaseErrorResponse | null | undefined) {
    if (data == null) {
      return null;
    }
    return { code: data.code, message: data.message };
  }

  private getData(data: PlanRequestData | null | undefined): PlanRequest | null {
    if (data == null) {
      return null;
    }
    const ticketTypes: PlanRequestTicketType[] = data.ticket_types.map((ticket_type: PlanRequestTicketTypeData) => {
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
    const dates: PlanRequestDate[] = data.dates.map((date: PlanRequestDateData) => {
      return new PlanRequestDate(date.starts_at, date.ends_at, date.id, date.plan_request_id);
    });
    const images: PlanRequestImage[] = data.images.map(image => {
      return new PlanRequestImage(image.image_url, image.id, image.plan_request_id);
    });
    return new PlanRequest(
      data.status,
      data.partner_id,
      ticketTypes,
      dates,
      images,
      data.id,
      data.created_at,
      data.updated_at,
      data.plan_id ?? undefined,
      data.web_url ?? undefined,
      data.plan_name,
      data.plan_description ?? undefined,
      data.city,
      data.address,
      data.accessibility,
      data.surcharge_agreed ?? undefined,
      data.closing_sales,
      data.additional_information ?? undefined,
      data.validation_method,
      data.codes_type,
      data.codes_validation,
      data.codes_file_url ?? undefined,
      data.faq ?? undefined,
      data.terms_and_conditions ?? undefined,
      data.b2b_user
        ? new User(
            data.b2b_user.id,
            data.b2b_user.email ?? undefined,
            undefined,
            data.b2b_user.name ?? undefined,
            undefined,
            undefined,
            data.b2b_user.username ?? undefined,
          )
        : undefined,
    );
  }
}
