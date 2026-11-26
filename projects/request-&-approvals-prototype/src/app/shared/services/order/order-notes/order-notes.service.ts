import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';

import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

import { environment } from '../../../../../environments/environment';
import { ErrorResponseUtils } from '../../../utils/error-response.utils';
import { PartnerService } from '../../partner/partner.service';
import { UserService } from '../../user/user.service';
import { SetOrderNoteQuery } from './set-order-note-query';

@Injectable({
  providedIn: 'root',
})
export class OrderNotesService {
  constructor(
    private httpClient: HttpClient,
    private partnerService: PartnerService,
    private userService: UserService,
  ) {}

  setOrderNote(orderId: number, query: SetOrderNoteQuery): Observable<any> {
    const path = this.getSetOrderNoteUrl(orderId);
    const body = this.getSetOrderNoteBody(query);

    return this.httpClient.post(path, body).pipe(
      map(response => response),
      catchError(err => throwError(() => ErrorResponseUtils.getErrorResponseError(err))),
    );
  }

  deleteOrderNote(orderId: number): Observable<any> {
    const path = this.getDeleteOrderNoteUrl(orderId);

    return this.httpClient.delete(path).pipe(
      map(response => response),
      catchError(err => throwError(ErrorResponseUtils.getErrorResponseError(err))),
    );
  }

  private getSetOrderNoteUrl(orderId: number): string {
    return `${environment.apiBaseUrl}/partners/${this.getPartnerId()}/orders/${orderId}/notes/`;
  }

  private getSetOrderNoteBody(query: SetOrderNoteQuery): any {
    return {
      title: query.title,
      message: query.message,
      user_id: this.userService.getUserId(),
      username: this.userService.getUserEmail(),
    };
  }

  private getDeleteOrderNoteUrl(orderId: number): string {
    return `${environment.apiBaseUrl}/partners/${this.getPartnerId()}/orders/${orderId}/notes/delete/`;
  }

  private getPartnerId(): number {
    return this.partnerService.getPartner()?.id as number;
  }
}
