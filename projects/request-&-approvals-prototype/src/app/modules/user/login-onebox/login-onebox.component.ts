import { Component, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';

import { OboSecondScreenDataService } from '@fz-original/app/modules/box-office/obo-second-screen/services/obo-second-screen-data.service';
import { SpinnerService } from '@fz-original/app/shared/layout/spinner/spinner.service';
import { LandingTargetService } from '@fz-original/app/shared/services/landing-target/landing-target.service';
import { PartnerThemeLoaderService } from '@fz-original/app/shared/services/partner-theme-loader/partner-theme-loader.service';
import { PartnerService } from '@fz-original/app/shared/services/partner/partner.service';
import { UserService } from '@fz-original/app/shared/services/user/user.service';
import { defer, Observable, of, throwError } from 'rxjs';
import { catchError, finalize, switchMap } from 'rxjs/operators';

import { environment } from '../../../../environments/environment';
import { AuthenticationService } from '../../../core/authentication/authentication.service';
import { ANALYTICS_HOME_PERMISSIONS } from '../../reports/analytics-permissions';

@Component({
  selector: 'app-login-onebox',
  standalone: false,
  templateUrl: './login-onebox.component.html',
  styleUrls: ['./login-onebox.component.scss'],
})
export class LoginOneboxComponent {
  #authenticationService = inject(AuthenticationService);
  #destroyRef = inject(DestroyRef);
  #entityId = '';
  #hasProcessedParams = false;
  #oboSecondScreenDataService = inject(OboSecondScreenDataService);
  #partnerService = inject(PartnerService);
  #partnerThemeLoaderService = inject(PartnerThemeLoaderService);
  #redirectTo = '';
  #route = inject(ActivatedRoute);
  #router = inject(Router);
  #spinnerService = inject(SpinnerService);
  #token = '';
  #userService = inject(UserService);

  constructor() {
    this.#spinnerService.show();

    this.#route.queryParams.pipe(takeUntilDestroyed(this.#destroyRef)).subscribe(params => {
      const entityId = params['entityId'];
      const token = params['token'];
      const redirectTo = params['redirectTo'];

      if (entityId && token && !this.#hasProcessedParams) {
        this.#hasProcessedParams = true;
        this.#entityId = entityId;
        this.#token = token;
        this.#redirectTo = redirectTo || '';

        this.#login();
      } else if (!this.#hasProcessedParams) {
        this.#redirectToOneboxPanel();
      }
    });
  }

  #login(): void {
    this.#authenticationService.clearDataForExternalLogin();

    this.#authenticationService
      .oneboxLogin(this.#entityId, this.#token)
      .pipe(
        switchMap(response => {
          this.#router.navigate([], {
            relativeTo: this.#route,
            queryParams: {},
            replaceUrl: true,
          });

          if (response.data?.organizationId) {
            return this.#selectOrganizationAndNavigate$(response.data.organizationId);
          }

          this.#partnerThemeLoaderService.init(null, null);

          return this.#navigateToLanding$();
        }),
        finalize(() => {
          this.#spinnerService.hide();
        }),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe({
        error: () => {
          this.#router.navigate([], {
            relativeTo: this.#route,
            queryParams: {},
            replaceUrl: true,
          });

          this.#redirectToOneboxPanel();
        },
      });
  }

  #navigateToLanding$(replaceUrl = false): Observable<boolean> {
    return this.#resolveLandingUrl$().pipe(
      switchMap((targetUrl: string) => this.#router.navigateByUrl(targetUrl, { replaceUrl })),
      catchError(() => of(false)),
    );
  }

  #resolveLandingUrl$(): Observable<string> {
    return defer(() => this.#userService.getPermissionsInOrganization()).pipe(
      switchMap(() => (this.#redirectTo ? of(this.#redirectTo) : this.#resolveReportingUrl$())),
      catchError(() => of(this.#redirectTo || this.#userService.getFirstActiveUrlByPermission())),
    );
  }

  #resolveReportingUrl$(): Observable<string> {
    if (!ANALYTICS_HOME_PERMISSIONS.some(permission => this.#userService.hasPermission(permission))) {
      return of(this.#userService.getFirstActiveUrlByPermission());
    }

    return of(LandingTargetService.analyticsHomeUrl);
  }

  #redirectToOneboxPanel(): void {
    this.#spinnerService.hide();
    window.location.href = environment.oneboxPanelBaseUrl;
  }

  #selectOrganizationAndNavigate$(organizationId: number): Observable<boolean> {
    return this.#partnerService.get(organizationId).pipe(
      switchMap(response => {
        if (!response?.data) {
          return throwError(() => new Error('Organization not found'));
        }

        this.#partnerService.select(response.data);
        this.#partnerThemeLoaderService.init(null, response.data.id);
        this.#oboSecondScreenDataService.create(response.data.id);

        return this.#navigateToLanding$(true);
      }),
    );
  }
}
