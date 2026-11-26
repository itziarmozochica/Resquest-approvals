import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { Observable, of, throwError } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';

import { environment } from '../../../../environments/environment';
import { BaseResponse } from '../../../shared/models/base-response';
import { PartnerService } from '../../../shared/services/partner/partner.service';
import { RescheduleSettingsService } from '../../../shared/services/reschedule-settings/reschedule-settings.service';
import { UserService } from '../../../shared/services/user/user.service';
import { ErrorResponseUtils } from '../../../shared/utils/error-response.utils';
import { OrderRescheduled, OrderRescheduledDTO, RescheduleOrderDTO, SessionItem } from '../models/reschedule-order.model';
import { RescheduleOrderAdapter } from './reschedule-order.adapter';

@Injectable({
  providedIn: 'root',
})
export class RescheduleOrderService {
  readonly #rescheduleSettingsService = inject(RescheduleSettingsService);

  constructor(
    private httpClient: HttpClient,
    private partnerService: PartnerService,
    private userService: UserService,
    private rescheduleOrderAdapter: RescheduleOrderAdapter,
  ) {}

  isPaidByPartnerAllowed(orderId: number): Observable<boolean> {
    return this.#rescheduleSettingsService.isPaidByPartnerAllowed(`orders/${orderId}`);
  }

  rescheduleOrder(
    planId: number,
    placeId: number,
    orderId: number,
    sessionItems: SessionItem[],
    onsiteSetupId?: string,
  ): Observable<BaseResponse<OrderRescheduled>> {
    const url = this.getRescheduleOrderUrl(planId, placeId, orderId);
    const body: RescheduleOrderDTO = this.getRescheduleOrderBody(sessionItems, onsiteSetupId);

    return this.httpClient.post<BaseResponse<OrderRescheduledDTO>>(url, body).pipe(
      switchMap(response => of(this.rescheduleOrderAdapter.fromApi(response))),
      catchError(error => throwError(ErrorResponseUtils.getErrorResponseError(error))),
    );
  }

  private getRescheduleOrderUrl(planId: number, placeId: number, orderId: number): string {
    const partner = this.partnerService.getPartner();
    if (!partner) {
      throw new Error('Unexpected error retriever Partner data for reschedule');
    }
    return `${environment.apiGWBaseUrl}/1.0/partners/${partner.id}/plans/${planId}/places/${placeId}/orders/${orderId}/reschedule`;
  }

  private getRescheduleOrderBody(sessionItems: SessionItem[], onsiteSetupId?: string): RescheduleOrderDTO {
    const user = this.userService.getUser()!;
    return this.rescheduleOrderAdapter.toApi({
      sessions: sessionItems,
      b2bUser: {
        b2bUserId: user.id,
        b2bUserEmail: user.email!,
        b2bUserName: user.name!,
        b2bUserUsername: user.username!,
        b2bUserInterface: user.interfaceType!,
      },
      onsiteSetupId: onsiteSetupId,
    });
  }
}
