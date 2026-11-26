import { HttpClient, HttpContext } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { SKIP_FORBIDDEN_TOAST } from '@fz-original/app/shared/interceptors/skip-forbidden-toast.token';
import { SKIP_RETRY_INTERCEPTOR } from '@fz-original/app/shared/interceptors/skip-retry.token';
import { BaseResponse } from '@fz-original/app/shared/models/base-response';
import { environment } from '@fz-original/environments/environment';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { MemberAccountAutoApplyResponse } from '../models/responses/member-account-response.model';
import { MemberBenefitsNotAppliedError, memberBenefitsNotAppliedMessage } from './member-benefits-not-applied.error';

@Injectable({
  providedIn: 'root',
})
export class MemberAccountAutoApplyService {
  readonly #httpClient = inject(HttpClient);

  autoApply$(partnerId: number, cartId: string, loyaltyProvider: string, providerAccountIds: ReadonlyArray<string>): Observable<void> {
    const url = `${environment.apiBaseUrl}/3.0/partners/${partnerId}/carts/${cartId}/member-benefits/auto-apply/`;
    const context = new HttpContext().set(SKIP_RETRY_INTERCEPTOR, true).set(SKIP_FORBIDDEN_TOAST, true);
    const body = { loyalty_provider: loyaltyProvider, provider_account_ids: [...providerAccountIds] };

    return this.#httpClient.post<BaseResponse<MemberAccountAutoApplyResponse>>(url, body, { context }).pipe(
      map((response: BaseResponse<MemberAccountAutoApplyResponse>): void => {
        if (response?.error != null || response?.data == null) {
          throw new MemberBenefitsNotAppliedError(memberBenefitsNotAppliedMessage);
        }
      }),
    );
  }
}
