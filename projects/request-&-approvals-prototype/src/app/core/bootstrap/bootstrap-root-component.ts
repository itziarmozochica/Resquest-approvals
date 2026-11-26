import { DOCUMENT } from '@angular/common';
import { ApplicationRef, Type } from '@angular/core';

import { ErrorLikeWithContext } from '../../shared/services/error-logger/error-like-with-context';
import { ErrorLoggerService } from '../../shared/services/error-logger/error-logger.service';

export const APP_ROOT_SELECTOR = 'app-root';

export function bootstrapRootComponent(appRef: ApplicationRef, rootComponent: Type<unknown>): void {
  const document = appRef.injector.get(DOCUMENT);

  if (document.querySelector(APP_ROOT_SELECTOR) === null) {
    appRef.injector.get(ErrorLoggerService).trace(
      new ErrorLikeWithContext(`Bootstrap skipped: "${APP_ROOT_SELECTOR}" is not in the document.`, {
        readyState: document.readyState,
        visibilityState: document.visibilityState,
      }),
    );

    return;
  }

  appRef.bootstrap(rootComponent);
}
