import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { ErrorResponseUtils } from '@fz-original/app/shared/utils/error-response.utils';
import { environment } from '@fz-original/environments/environment';
import { catchError, Observable, throwError } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class SplitPackService {
  #http = inject(HttpClient);

  splitPackTicket(partnerId: number, ticketId: number, count?: number): Observable<void> {
    const url: string = this.#getSplitTicketUrl(partnerId, ticketId);
    const body = count !== undefined ? { units_to_split: count } : {};
    return this.#http
      .post<void>(url, body)
      .pipe(catchError((error: unknown) => throwError(() => ErrorResponseUtils.getErrorResponseError(error))));
  }

  #getSplitTicketUrl(partnerId: number, ticketId: number): string {
    return `${environment.apiBaseUrl}/3.0/partners/${partnerId}/tickets/${ticketId}/split-pack/`;
  }
}
