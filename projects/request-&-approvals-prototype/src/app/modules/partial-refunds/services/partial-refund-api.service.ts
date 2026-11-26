import { HttpClient, HttpContext } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { SKIP_RETRY_INTERCEPTOR } from '@fz-original/app/shared/interceptors/skip-retry.token';
import type { BaseErrorResponse, BaseResponseDTO } from '@fz-original/app/shared/models/base-response';
import { ErrorResponseUtils } from '@fz-original/app/shared/utils/error-response.utils';
import { environment } from '@fz-original/environments/environment';
import { throwError, type Observable } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

import type { PartialRefundJob, PartialRefundJobDTO, PartialRefundJobRequest } from '../models/partial-refund-job.model';
import type { PartialRefundPreview, PartialRefundPreviewDTO, PartialRefundPreviewRequest } from '../models/partial-refund-preview.model';
import { adaptPartialRefundPreview } from '../utils/adapt-partial-refund-preview.util';
import { buildJobPayload, buildPreviewPayload } from '../utils/build-partial-refund-payload.util';

@Injectable({
  providedIn: 'root',
})
export class PartialRefundApiService {
  readonly #http = inject(HttpClient);

  /**
   * Refunds money. Fever2 queues one item per matched order and answers with the id straight away,
   * so a 201 means the work was accepted, never that it finished. There is no endpoint to ask how
   * it went, so the id is the only handle the agent is left with.
   */
  createJob(partnerId: number, request: PartialRefundJobRequest): Observable<PartialRefundJob> {
    return this.#http
      .post<BaseResponseDTO<PartialRefundJobDTO>>(this.#jobsUrl(partnerId), buildJobPayload(request), {
        // Not idempotent. RetryInterceptor re-sends on any 5xx or dropped connection, and a gateway
        // that times out after fever2 has queued the job would have the same refund queued again.
        // No `timeout` header either: a client-side timeout on a request the engine may have accepted
        // would report "nothing was refunded" for a refund that is on its way.
        context: new HttpContext().set(SKIP_RETRY_INTERCEPTOR, true),
      })
      .pipe(
        map(response => {
          // The id is the only proof anything was queued, so an envelope without one is a failure
          // whatever the status line says: showing "Refund sent" on it would be a lie.
          const jobId = response.data?.job_id;
          if (typeof jobId !== 'string' || jobId.length === 0) {
            const error: BaseErrorResponse | null | undefined = response.error;
            throw new Error(error?.userError ?? error?.message ?? 'The partial refund job response carried no id.');
          }
          return { jobId };
        }),
        catchError(error => throwError(() => ErrorResponseUtils.getErrorResponseError(error))),
      );
  }

  /**
   * Read-only. A request with `value: 0` returns the selection's ticket count and refundable and
   * already-refunded amounts with a zero refund, which is what the earlier steps summarise.
   */
  getPreview(partnerId: number, request: PartialRefundPreviewRequest): Observable<PartialRefundPreview> {
    return this.#http.post<BaseResponseDTO<PartialRefundPreviewDTO>>(this.#previewUrl(partnerId), buildPreviewPayload(request)).pipe(
      map(response => {
        // The envelope's `data` is nullable for every endpoint. Adapting null would throw on the
        // first field read; failing here instead puts the screen in its error state, which is the
        // honest outcome when the engine answered without a preview. The envelope's own error is
        // the only account of why it is missing, so it is what gets reported.
        if (response.data === null || response.data === undefined) {
          const error: BaseErrorResponse | null | undefined = response.error;
          throw new Error(error?.userError ?? error?.message ?? 'The partial refund preview response carried no data.');
        }
        return adaptPartialRefundPreview(response.data);
      }),
      catchError(error => throwError(() => ErrorResponseUtils.getErrorResponseError(error))),
    );
  }

  #jobsUrl(partnerId: number): string {
    return `${environment.apiGWBaseUrl}/1.0/partners/${partnerId}/partial-refunds/jobs`;
  }

  /** Partner-scoped: the plan is implied by the session ids the criteria carries. */
  #previewUrl(partnerId: number): string {
    return `${environment.apiGWBaseUrl}/1.0/partners/${partnerId}/partial-refunds/preview`;
  }
}
