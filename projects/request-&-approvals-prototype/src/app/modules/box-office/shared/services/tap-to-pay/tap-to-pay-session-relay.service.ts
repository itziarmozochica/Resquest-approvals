import { DestroyRef, inject, Injectable } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { AuthenticationService } from '@fz-original/app/core/authentication/authentication.service';
import { DatadogLogService } from '@fz-original/app/core/error/datadog/logger/datadog-log.service';
import type { TapToPaySessionAnswer, TapToPaySessionRequest } from '@fz-original/app/payments/models/tap-to-pay.model';
import {
  TAP_TO_PAY_SESSION_ERROR_BACKEND_UNREACHABLE,
  TAP_TO_PAY_SESSION_ERROR_INVALID_REQUEST,
  TAP_TO_PAY_SESSION_ERROR_NO_BOX_OFFICE,
  TAP_TO_PAY_SESSION_ERROR_NOT_AVAILABLE,
  TapToPaySessionError,
  TapToPaySessionResultMessage,
} from '@fz-original/app/payments/models/tap-to-pay.model';
import { PaymentsService } from '@fz-original/app/payments/services/payments.service';
import { PartnerService } from '@fz-original/app/shared/services/partner/partner.service';
import { MessageType, WebviewMessengerService } from '@fz-original/app/shared/services/webview-messenger/webview-messenger.service';
import { EMPTY, Observable, of } from 'rxjs';
import { catchError, map, mergeMap } from 'rxjs/operators';

import { getTapToPayPaymentConfiguration, tapToPaySessionFailure } from '../../utils/tap-to-pay.util';
import { OnsiteSetupsStorageService } from '../onsite-setups/onsite-setups-storage.service';

@Injectable({
  providedIn: 'root',
})
export class TapToPaySessionRelayService {
  readonly #authenticationService = inject(AuthenticationService);
  readonly #datadogLogService = inject(DatadogLogService);
  readonly #destroyRef = inject(DestroyRef);
  readonly #onsiteSetupsStorageService = inject(OnsiteSetupsStorageService);
  readonly #partnerService = inject(PartnerService);
  readonly #paymentsService = inject(PaymentsService);
  readonly #webviewMessengerService = inject(WebviewMessengerService);

  #started = false;

  start(): void {
    if (this.#started) {
      return;
    }
    this.#started = true;
    this.#webviewMessengerService
      .observe<TapToPaySessionRequest>(MessageType.TapToPaySession, { includeUnconsumed: true })
      .pipe(
        mergeMap(request => this.#answer(request)),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe(answer => this.#reply(answer));
  }

  #answer(request: TapToPaySessionRequest): Observable<TapToPaySessionAnswer> {
    const requestId = request?.requestId ?? '';
    if (requestId === '') {
      this.#datadogLogService.logWarn('[TapToPaySessionRelay] Session request without a request id');
      return EMPTY;
    }
    const partnerId = this.#partnerService.getActingOrganizationId();
    const setup = this.#onsiteSetupsStorageService.getConfiguration();
    if (!this.#authenticationService.isLoggedIn() || partnerId === null || setup === null) {
      return of(tapToPaySessionFailure(requestId, 409, TAP_TO_PAY_SESSION_ERROR_NO_BOX_OFFICE));
    }
    const paymentConfiguration = getTapToPayPaymentConfiguration(setup);
    if (paymentConfiguration === null) {
      return of(tapToPaySessionFailure(requestId, 409, TAP_TO_PAY_SESSION_ERROR_NOT_AVAILABLE));
    }
    const setupToken = request.data?.setupToken ?? '';
    if (setupToken === '') {
      return of(tapToPaySessionFailure(requestId, 400, TAP_TO_PAY_SESSION_ERROR_INVALID_REQUEST));
    }
    return this.#paymentsService.createTapToPaySession({ partnerId, paymentConfigurationId: paymentConfiguration.id, setupToken }).pipe(
      map((session): TapToPaySessionAnswer => ({ data: session, errorCode: null, requestId, status: 200 })),
      catchError((error: unknown) =>
        of(
          error instanceof TapToPaySessionError
            ? tapToPaySessionFailure(requestId, error.status, error.errorCode)
            : tapToPaySessionFailure(requestId, 503, TAP_TO_PAY_SESSION_ERROR_BACKEND_UNREACHABLE),
        ),
      ),
    );
  }

  #reply(answer: TapToPaySessionAnswer): void {
    this.#datadogLogService.logInfo('[TapToPaySessionRelay] Answered a Tap to Pay session request', {
      error_code: answer.errorCode,
      request_id: answer.requestId,
      status: answer.status,
    });
    try {
      this.#webviewMessengerService.sendWebViewMessage(new TapToPaySessionResultMessage(answer));
    } catch {
      this.#datadogLogService.logError('[TapToPaySessionRelay] Could not send a Tap to Pay session answer', {
        request_id: answer.requestId,
      });
    }
  }
}
