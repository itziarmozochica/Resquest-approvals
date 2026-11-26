import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';

import { Observable, of } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';

import { environment } from '../../../../../environments/environment';
import { BaseResponse, HttpErrorResponseWithBaseError } from '../../../../shared/models/base-response';
import { getHttpBaseErrorResponseError } from '../../../../shared/utils/error-response.utils';
import { PurchaseConfirmationResendService } from './purchase-confirmation-resend';
import { ResendPurchaseConfirmationEmailBody } from './resend-purchase-confirmation-email-body.model';
import { ResendPurchaseConfirmationEmailData } from './resend-purchase-confirmation-email-data.model';
import { ResendWhatsappPurchaseConfirmationData } from './resend-whatsapp-purchase-confirmation-data.model';

@Injectable({
  providedIn: 'root',
})
export class BoxOfficePurchaseConfirmationResendService implements PurchaseConfirmationResendService {
  constructor(private httpClient: HttpClient) {}

  resendPurchaseConfirmationEmail(data: ResendPurchaseConfirmationEmailData): Observable<BaseResponse<unknown>> {
    const { codeIds, email, partnerId, placeId, planId, ticketId } = data;
    const path: string = this.getResendPurchaseConfirmationEmailUrl(partnerId, planId, placeId, ticketId);
    const body: ResendPurchaseConfirmationEmailBody = {};
    if (email) {
      body.email = email;
    }
    if (codeIds !== undefined && codeIds.length > 0) {
      body.code_ids = codeIds;
    }
    const payload = Object.keys(body).length > 0 ? body : null;
    return this.httpClient.post<void>(path, payload).pipe(
      switchMap(() => {
        return of(new BaseResponse({}, null));
      }),
      catchError((response: HttpErrorResponseWithBaseError) => of(new BaseResponse(null, getHttpBaseErrorResponseError(response)))),
    );
  }

  resendWhatsappPurchaseConfirmation(data: ResendWhatsappPurchaseConfirmationData): Observable<BaseResponse<unknown>> {
    const path = this.getResendWhatsappPurchaseConfirmationUrl(data.partnerId, data.ticketId);
    return this.httpClient.post<void>(path, null).pipe(
      switchMap(() => {
        return of(new BaseResponse({}, null));
      }),
      catchError((response: HttpErrorResponseWithBaseError) => of(new BaseResponse(null, getHttpBaseErrorResponseError(response)))),
    );
  }

  private getResendPurchaseConfirmationEmailUrl(partnerId: number, planId: number, placeId: number, ticketId: number): string {
    return `${environment.apiBaseUrl}/partners/${partnerId}/plans/${planId}/places/${placeId}/tickets/${ticketId}/resend_purchase_confirmation_email/`;
  }

  private getResendWhatsappPurchaseConfirmationUrl(partnerId: number, ticketId: number): string {
    return `${environment.apiBaseUrl}/3.0/partners/${partnerId}/tickets/${ticketId}/resend-whatsapp-purchase-confirmation/`;
  }
}
