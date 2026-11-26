import { HttpClient, HttpContext, HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { SKIP_AUTHENTICATION_INTERCEPTOR } from '@fz-original/app/shared/interceptors/skip-authentication.token';
import { SKIP_FORBIDDEN_TOAST } from '@fz-original/app/shared/interceptors/skip-forbidden-toast.token';
import { SKIP_RETRY_INTERCEPTOR } from '@fz-original/app/shared/interceptors/skip-retry.token';
import { SentryLoggerService } from '@fz-original/app/shared/services/error-logger/sentry-logger.service';
import { environment } from '@fz-original/environments/environment';
import { Observable } from 'rxjs';

import { QuickSetupFeedbackPayload } from '../models/quick-setup-feedback.model';

@Injectable({
  providedIn: 'root',
})
export class CreateEventQuickSetupFeedbackService {
  readonly #http = inject(HttpClient);
  readonly #sentryLoggerService = inject(SentryLoggerService);

  /**
   * Fire-and-forget: the optional note must never delay its caller nor surface an error to the partner,
   * so the request is fired here and every failure is swallowed for the partner and logged as a warning for us.
   *
   * Deliberately not bound to any component lifetime: the caller closes its dialog and navigates right
   * after, and a `takeUntilDestroyed` subscription would cancel the in-flight request and lose the note.
   *
   * The request opts out of the shared interceptors: a retry would deliver the note twice, and a `401`
   * or `403` would tear down the session or toast an access error over an unrelated flow.
   */
  sendFeedback(partnerId: number, payload: QuickSetupFeedbackPayload): void {
    this.#createFeedback(partnerId, payload).subscribe({
      error: (error: HttpErrorResponse) =>
        this.#sentryLoggerService.logWarning(`Quick setup review feedback could not be sent (status ${error.status})`),
    });
  }

  #createFeedback(partnerId: number, payload: QuickSetupFeedbackPayload): Observable<void> {
    const url = this.#getCreateFeedbackUrl(partnerId);
    const context = new HttpContext()
      .set(SKIP_RETRY_INTERCEPTOR, true)
      .set(SKIP_FORBIDDEN_TOAST, true)
      .set(SKIP_AUTHENTICATION_INTERCEPTOR, true);

    return this.#http.post<void>(url, payload, { context });
  }

  #getCreateFeedbackUrl(partnerId: number): string {
    return `${environment.apiGWBaseUrl}/1.0/partners/${partnerId}/feedback`;
  }
}
