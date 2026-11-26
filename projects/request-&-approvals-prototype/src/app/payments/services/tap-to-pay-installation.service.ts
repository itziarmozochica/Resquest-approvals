import { inject, Injectable } from '@angular/core';

import { MessageType, WebviewMessengerService } from '@fz-original/app/shared/services/webview-messenger/webview-messenger.service';
import { defer, Observable, throwError } from 'rxjs';
import { catchError, filter, map, take, timeout } from 'rxjs/operators';

import type { TapToPayBridgeResult, TapToPayInstallation } from '../models/tap-to-pay.model';
import { TapToPayInstallationError, TapToPayInstallationMessage } from '../models/tap-to-pay.model';
import { createTapToPayRequestId } from '../utils/tap-to-pay-request-id.util';

@Injectable({
  providedIn: 'root',
})
export class TapToPayInstallationService {
  static readonly replyTimeoutMs = 30_000;

  readonly #webviewMessengerService = inject(WebviewMessengerService);

  requestInstallationId(): Observable<string> {
    return defer(() => {
      const requestId = createTapToPayRequestId();
      const result$ = this.#webviewMessengerService
        .observe<TapToPayBridgeResult<TapToPayInstallation>>(MessageType.TapToPayInstallationResult)
        .pipe(
          filter(result => result.requestId === requestId),
          take(1),
          timeout(TapToPayInstallationService.replyTimeoutMs),
        );
      this.#webviewMessengerService.sendWebViewMessage(new TapToPayInstallationMessage(requestId));
      return result$;
    }).pipe(
      map(result => {
        const installationId = result.data?.installationId ?? '';
        if (result.status !== 200 || installationId === '') {
          throw new TapToPayInstallationError('rejected', result.errorCode ?? null);
        }
        return installationId;
      }),
      catchError((error: unknown) =>
        throwError(() => (error instanceof TapToPayInstallationError ? error : new TapToPayInstallationError('no_reply'))),
      ),
    );
  }
}
