import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';

import { Observable, of } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';

import { environment } from '../../../../../environments/environment';
import { BaseResponse } from '../../../../shared/models/base-response';
import { AlternativeConfirmationEmailService } from './alternative-confirmation-email';
import { KioskConfirmationEmailData } from './kiosk-confirmation-email.model';

@Injectable({
  providedIn: 'root',
})
export class KioskConfirmationEmailService implements AlternativeConfirmationEmailService {
  constructor(private httpClient: HttpClient) {}

  sendAlternativeConfirmationEmail(data: KioskConfirmationEmailData): Observable<BaseResponse<null>> {
    const { email, partnerId, planId, placeId, orderId } = data;
    const path: string = this.getAlternativeConfirmationEmailUrl(partnerId, planId, placeId, orderId);

    return this.httpClient.post(path, { recipient_email: email }).pipe(
      switchMap(() => of(new BaseResponse(null, null))),
      catchError(response => {
        return of(
          new BaseResponse(null, {
            code: response.status,
            message: response.error?.message,
          }),
        );
      }),
    );
  }

  private getAlternativeConfirmationEmailUrl(partnerId: number, planId: number, placeId: number, orderId: number): string {
    return `${environment.apiBaseUrl}/partners/${partnerId}/plans/${planId}/places/${placeId}/orders/${orderId}/alternative-email/`;
  }
}
