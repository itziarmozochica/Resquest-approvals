import { HttpClient, HttpContext } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { SKIP_RETRY_INTERCEPTOR } from '@fz-original/app/shared/interceptors/skip-retry.token';
import { BaseResponse } from '@fz-original/app/shared/models/base-response';
import { ErrorResponseUtils } from '@fz-original/app/shared/utils/error-response.utils';
import { environment } from '@fz-original/environments/environment';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

import { MemberAccountBenefit, MemberAccountMembership, MemberAccountRef } from '../models/member-account.model';
import { MemberAccountBenefitsSearchResponse } from '../models/responses/member-account-response.model';
import { MemberAccountAdapter } from './member-account.adapter';

const MAXIMUM_MEMBER_ACCOUNTS = 20;

@Injectable({
  providedIn: 'root',
})
export class MemberAccountBenefitsService {
  readonly #httpClient = inject(HttpClient);
  readonly #memberAccountAdapter = inject(MemberAccountAdapter);

  search$(
    partnerId: number,
    planId: number,
    memberships: ReadonlyArray<MemberAccountMembership>,
  ): Observable<BaseResponse<ReadonlyMap<number, MemberAccountBenefit>>> {
    const url = `${environment.apiBaseUrl}/3.0/loyalty/partners/${partnerId}/plans/${planId}/member-benefits/search/`;
    const context = new HttpContext().set(SKIP_RETRY_INTERCEPTOR, true);
    const body = {
      member_accounts: this.#toMemberAccounts(memberships).map((account: MemberAccountRef) => ({
        loyalty_provider: account.loyaltyProvider,
        provider_account_id: account.providerAccountId,
      })),
    };

    return this.#httpClient.post<BaseResponse<MemberAccountBenefitsSearchResponse>>(url, body, { context }).pipe(
      map(result => this.#memberAccountAdapter.adaptMemberAccountBenefits(result)),
      catchError(error => throwError(() => new BaseResponse(null, ErrorResponseUtils.getErrorResponseError(error)))),
    );
  }

  #toMemberAccounts(memberships: ReadonlyArray<MemberAccountMembership>): Array<MemberAccountRef> {
    const byKey = new Map<string, MemberAccountRef>();

    for (const membership of memberships) {
      byKey.set(`${membership.loyaltyProvider}|${membership.providerAccountId}`, {
        loyaltyProvider: membership.loyaltyProvider,
        providerAccountId: membership.providerAccountId,
      });
    }

    return [...byKey.values()].slice(0, MAXIMUM_MEMBER_ACCOUNTS);
  }
}
