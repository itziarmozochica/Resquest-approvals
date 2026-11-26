import { HttpClient, HttpContext } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { SKIP_RETRY_INTERCEPTOR } from '@fz-original/app/shared/interceptors/skip-retry.token';
import { BaseResponse } from '@fz-original/app/shared/models/base-response';
import { ErrorResponseUtils } from '@fz-original/app/shared/utils/error-response.utils';
import { environment } from '@fz-original/environments/environment';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

import { MemberAccountMembership } from '../models/member-account.model';
import { MemberAccountIdentifyResponse } from '../models/responses/member-account-response.model';
import { MemberAccountAdapter } from './member-account.adapter';

@Injectable({
  providedIn: 'root',
})
export class MemberAccountService {
  readonly #httpClient = inject(HttpClient);
  readonly #memberAccountAdapter = inject(MemberAccountAdapter);

  identify$(partnerId: number, value: string): Observable<BaseResponse<Array<MemberAccountMembership>>> {
    const url = `${environment.apiBaseUrl}/3.0/loyalty/partners/${partnerId}/members/identify/`;
    const context = new HttpContext().set(SKIP_RETRY_INTERCEPTOR, true);
    return this.#httpClient.post<BaseResponse<MemberAccountIdentifyResponse>>(url, { value }, { context }).pipe(
      map(result => this.#memberAccountAdapter.adaptMemberAccountMemberships(result)),
      catchError(error => throwError(() => new BaseResponse(null, ErrorResponseUtils.getErrorResponseError(error)))),
    );
  }
}
