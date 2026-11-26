import { Location } from '@angular/common';
import { Component, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';

import { SpinnerService } from '@fz-original/app/shared/layout/spinner/spinner.service';
import { EMPTY } from 'rxjs';
import { finalize, switchMap } from 'rxjs/operators';

import { AuthenticationService } from '../../../core/authentication/authentication.service';
import { UserService } from '../../../shared/services/user/user.service';

@Component({
  selector: 'app-login-backoffice',
  standalone: false,
  templateUrl: './login-backoffice.component.html',
  styleUrls: ['./login-backoffice.component.scss'],
})
export class LoginBackofficeComponent {
  #authenticationService = inject(AuthenticationService);
  #destroyRef = inject(DestroyRef);
  #hasProcessedParams = false;
  #location = inject(Location);
  #redirectTo = '';
  #route = inject(ActivatedRoute);
  #router = inject(Router);
  #spinnerService = inject(SpinnerService);
  #token = '';
  #userService = inject(UserService);

  constructor() {
    this.#spinnerService.show();

    this.#route.queryParams.pipe(takeUntilDestroyed(this.#destroyRef)).subscribe(params => {
      const token = params['token'];
      const redirectTo = params['redirectTo'];

      if (token && !this.#hasProcessedParams) {
        this.#hasProcessedParams = true;
        this.#token = token;
        this.#redirectTo = redirectTo || '';

        this.#login();
      } else if (!this.#hasProcessedParams) {
        this.#redirectToLoginPage();
      }
    });
  }

  #login(): void {
    this.#authenticationService.clearDataForExternalLogin();

    this.#authenticationService
      .backofficeLogin(this.#token)
      .pipe(
        switchMap(() => {
          const userId = this.#authenticationService.getUserId();
          if (userId === null) {
            this.#redirectToLoginPage();
            return EMPTY;
          }
          return this.#userService.getOrganizations({ userId });
        }),
        finalize(() => {
          this.#spinnerService.hide();
        }),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe({
        next: () => {
          this.#navigateToTarget();
        },
        error: () => {
          this.#redirectToLoginPage();
        },
      });
  }

  #navigateToTarget(): void {
    const targetUrl = this.#redirectTo || AuthenticationService.defaultRedirectUrl;
    this.#location.replaceState(targetUrl);
    this.#router.navigateByUrl(targetUrl, { skipLocationChange: true });
  }

  #redirectToLoginPage(): void {
    const queryParams = this.#redirectTo ? { next: this.#redirectTo } : {};
    this.#router.navigate(['/login'], { queryParams });
  }
}
