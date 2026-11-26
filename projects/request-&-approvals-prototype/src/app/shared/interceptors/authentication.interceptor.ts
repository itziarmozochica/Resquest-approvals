import { HttpEvent, HttpHandler, HttpInterceptor, HttpRequest } from '@angular/common/http';
import { DestroyRef, inject, Injectable } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';

import { RoutePrimaryPath } from '@fz-original/app/app/enums/route.enum';
import { IgntDialogService } from '@ignite/common';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { TranslateService } from '@ngx-translate/core';
import { EMPTY, Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { environment } from '../../../environments/environment';
import { AuthenticationService } from '../../core/authentication/authentication.service';
import { SpinnerService } from '../layout/spinner/spinner.service';
import { ToastService } from '../services/toast/toast.service';
import { SKIP_AUTHENTICATION_INTERCEPTOR } from './skip-authentication.token';
import { SKIP_FORBIDDEN_TOAST } from './skip-forbidden-toast.token';

@Injectable({
  providedIn: 'root',
})
export class AuthenticationInterceptor implements HttpInterceptor {
  // ponytail: the premise is gone — `IgntToastService` mounts its own outlet into `document.body`, so these routes
  // can show a toast now and the blocking modal they get instead is no longer forced. Dropping the list is a UX
  // call on five surfaces, not a migration one, so it waits for its own ticket; `SKIP_FORBIDDEN_TOAST` is the same
  // interceptor's other escape hatch and should be re-read with it.
  static readonly ROUTES_WITHOUT_TOAST_HOST = ['kiosk', 'download-qr-ticket', 'ambassadors', 'ambassador-programs', 'support'];

  #isSessionExpiredOrAccessForbiddenModalOpen = false;

  readonly #destroyRef = inject(DestroyRef);
  readonly #dialogService = inject(IgntDialogService);
  readonly #modalService = inject(NgbModal);
  readonly #router = inject(Router);
  readonly #spinnerService = inject(SpinnerService);
  readonly #toastService = inject(ToastService);
  readonly #translate = inject(TranslateService);

  readonly authenticationService = inject(AuthenticationService);

  intercept(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    if (request.context.get(SKIP_AUTHENTICATION_INTERCEPTOR)) {
      return next.handle(request);
    }

    const isUserLogged: boolean = this.authenticationService.isLoggedIn();
    if (
      !this.#doesRequestRequiresToken(request.url) &&
      !isUserLogged &&
      !request.url.includes('validate-password-token') &&
      !request.url.includes('encoded_orders') &&
      !request.url.endsWith('/ambassadors') &&
      !this.#isPublicAmbassadorProgramUrl(request.url)
    ) {
      this.authenticationService.reset();
      return EMPTY;
    }

    return next.handle(request).pipe(
      catchError(err => {
        if (!isUserLogged || ![401, 403].includes(err?.status) || !this.#isApiCall(request.url)) {
          return throwError(err);
        }

        const currentUrl = window.location.pathname;
        const isNotOBOSecondScreenAndModalIsNotOpen =
          !this.#isOBOSecondScreen(currentUrl) && !this.#isSessionExpiredOrAccessForbiddenModalOpen;

        this.#spinnerService.hide();

        if (err?.status === 401) {
          if (isNotOBOSecondScreenAndModalIsNotOpen) {
            this.#manageModalResponse(err?.status, currentUrl);
          } else {
            this.authenticationService.reset(currentUrl);
          }
        } else if (err?.status === 403) {
          this.#manageForbiddenResponse(currentUrl, request.context.get(SKIP_FORBIDDEN_TOAST));
        }

        return throwError(err);
      }),
    );
  }

  #doesRequestRequiresToken(url: string): boolean {
    return !this.#isApiCall(url) || this.#isAuthenticationUrl(url);
  }

  #isApiCall(url: string): boolean {
    return (
      url.startsWith(environment.accessControlApiBaseUrl) ||
      url.startsWith(environment.apiBaseUrl) ||
      url.startsWith(environment.apiGWBaseUrl) ||
      url.startsWith(environment.agentsBaseUrl) ||
      url.startsWith(environment.apiIamBaseUrl) ||
      url.startsWith(environment.apiSpotsBaseUrl) ||
      url.startsWith(environment.notificationsInboxApiBaseUrl) ||
      url.startsWith(environment.adsApiBaseUrl) ||
      url.startsWith(environment.crmApiBaseUrl)
    );
  }

  /**
   * @deprecated Substring matching, so a fragment matches anywhere in the URL, query string
   * included. New exceptions opt out explicitly with `SKIP_AUTHENTICATION_INTERCEPTOR` instead of
   * adding a fragment here.
   */
  #isAuthenticationUrl(url: string): boolean {
    return (
      url.includes('login') ||
      url.includes('create-password') ||
      url.includes('recover-password') ||
      url.includes('reset-password') ||
      url.includes('request-password') ||
      url.includes('version') ||
      url.includes('mfa/enroll') ||
      url.includes('mfa/enroll/verify') ||
      url.includes('mfa/totp/verify') ||
      url.includes('mfa/recovery/verify')
    );
  }

  #isPublicAmbassadorProgramUrl(url: string): boolean {
    const ambassadorProgramPattern = /\/1\.0\/ambassador-programs\/[^/]+$/;
    return ambassadorProgramPattern.test(url);
  }

  #isOBOSecondScreen(currentUrl: string): boolean {
    return currentUrl === `/${RoutePrimaryPath[RoutePrimaryPath['obo-second-screen']]}`;
  }

  #isRouteWithoutToastHost(currentUrl: string): boolean {
    const [firstSegment] = currentUrl.split('/').filter(Boolean);

    return AuthenticationInterceptor.ROUTES_WITHOUT_TOAST_HOST.includes(firstSegment);
  }

  #manageForbiddenResponse(currentUrl: string, skipToast = false): void {
    if (this.#isOBOSecondScreen(currentUrl)) {
      this.#router.navigate(['/']);

      return;
    }

    if (this.#isSessionExpiredOrAccessForbiddenModalOpen) {
      return;
    }

    if (skipToast) {
      return;
    }

    if (this.#isRouteWithoutToastHost(currentUrl)) {
      this.#manageModalResponse(403, currentUrl);

      return;
    }

    const message: string = this.#translate.instant('errors.ACCESS_FORBIDDEN');

    if (this.#toastService.hasActiveToastWithMessage(message)) {
      return;
    }

    this.#toastService.addError(message);
  }

  #manageModalClosedOrDismissed(status: number, urlToPreserve: string): void {
    this.#isSessionExpiredOrAccessForbiddenModalOpen = false;

    if (status === 401) {
      this.authenticationService.reset(urlToPreserve);
    } else if (status === 403) {
      this.#router.navigate(['/']);
    }
  }

  #manageModalResponse(status: number, urlToPreserve: string): void {
    // Both stacks coexist until S13 (B2BP-1722): an expired session must clear the ng-bootstrap
    // dialogs still open on legacy surfaces as well as the Ignite ones.
    this.#dialogService.closeAll();
    this.#modalService.dismissAll();
    this.#isSessionExpiredOrAccessForbiddenModalOpen = true;

    const statusErrorToMessageMap: { [key: number]: string } = {
      401: 'errors.SESSION_EXPIRED',
      403: 'errors.ACCESS_FORBIDDEN',
    };
    const dialogRef = this.#dialogService.openMessageModal(
      this.#translate.instant('common.errorTitle'),
      this.#translate.instant(statusErrorToMessageMap[status]),
    );

    dialogRef.closed$.pipe(takeUntilDestroyed(this.#destroyRef)).subscribe(() => {
      this.#manageModalClosedOrDismissed(status, urlToPreserve);
    });
  }
}
