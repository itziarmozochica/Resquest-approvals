import { HttpClient, HttpContext, HttpHeaders, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { SKIP_FORBIDDEN_TOAST } from '@fz-original/app/shared/interceptors/skip-forbidden-toast.token';
import { SKIP_RETRY_INTERCEPTOR } from '@fz-original/app/shared/interceptors/skip-retry.token';
import { environment } from '@fz-original/environments/environment';
import { map, Observable } from 'rxjs';

export interface CheckoutEligibilityRequest {
  readonly channelId: string;
  readonly onsiteSetupId: string;
  readonly partnerId: number;
  readonly planIds: readonly number[];
  readonly userId: number;
}

@Injectable({
  providedIn: 'root',
})
export class CheckoutEligibilityApiService {
  readonly #http = inject(HttpClient);
  readonly #timeoutHeaders = new HttpHeaders({ timeout: '5000' });

  check(request: CheckoutEligibilityRequest): Observable<void> {
    const url = `${environment.apiGWBaseUrl}/1.0/partners/${request.partnerId}/users/${request.userId}/checkout-eligibility`;
    const params = new HttpParams({
      fromObject: {
        channel_id: request.channelId,
        onsite_setup_id: request.onsiteSetupId,
        plan_ids: request.planIds.map(String),
      },
    });

    return this.#http
      .get(url, {
        context: new HttpContext().set(SKIP_RETRY_INTERCEPTOR, true).set(SKIP_FORBIDDEN_TOAST, true),
        headers: this.#timeoutHeaders,
        params,
      })
      .pipe(map((): void => undefined));
  }
}
