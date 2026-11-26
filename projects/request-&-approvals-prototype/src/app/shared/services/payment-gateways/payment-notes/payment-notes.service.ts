import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { environment } from '@fz-original/environments/environment';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { ErrorResponseUtils } from '../../../utils/error-response.utils';
import { PartnerService } from '../../partner/partner.service';
import { UserService } from '../../user/user.service';
import { SetPaymentNoteQuery } from './set-payment-note-query';

export interface SetPaymentNoteRequestBody {
  title: string;
  message: string;
  user_id: number | undefined;
  username: string | undefined;
}

@Injectable({
  providedIn: 'root',
})
export class PaymentNotesService {
  #httpClient = inject(HttpClient);
  #partnerService = inject(PartnerService);
  #userService = inject(UserService);

  setNote(orderId: number, query: SetPaymentNoteQuery): Observable<unknown> {
    const partnerId = this.#getPartnerId();
    if (partnerId === undefined) {
      return throwError(() => new Error('Partner ID is undefined'));
    }
    const path = this.#getSetNoteUrl(orderId, partnerId);
    const body = this.#getSetNoteBody(query);

    return this.#httpClient.post(path, body).pipe(catchError(err => throwError(() => ErrorResponseUtils.getErrorResponseError(err))));
  }

  #getSetNoteUrl(orderId: number, partnerId: number): string {
    return `${environment.apiBaseUrl}/3.0/partners/${partnerId}/orders/${orderId}/payment-notes/`;
  }

  #getSetNoteBody(query: SetPaymentNoteQuery): SetPaymentNoteRequestBody {
    return {
      title: query.title,
      message: query.message,
      user_id: this.#userService.getUserId(),
      username: this.#userService.getUserEmail(),
    };
  }

  #getPartnerId(): number | undefined {
    return this.#partnerService.getPartner()?.id;
  }
}
