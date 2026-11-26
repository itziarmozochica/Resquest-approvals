import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, Router } from '@angular/router';

import { EMPTY, Observable, of } from 'rxjs';
import { catchError, mergeMap } from 'rxjs/operators';

import { AuthenticationService } from '../../../core/authentication/authentication.service';
import { SpinnerService } from '../../../shared/layout/spinner/spinner.service';
import { BaseResponse } from '../../../shared/models/base-response';

@Injectable({
  providedIn: 'root',
})
export class UpdatePasswordFormResolver {
  constructor(
    private authenticationService: AuthenticationService,
    private router: Router,
    private spinnerService: SpinnerService,
  ) {}
  resolve(route: ActivatedRouteSnapshot): Observable<BaseResponse<any>> {
    this.spinnerService.show();
    return this.authenticationService.validatePasswordToken(route.queryParams.token).pipe(
      mergeMap(response => {
        this.authenticationService.clearData();
        if (!response?.data) {
          this.router.navigate(['/password-token-expired']);
        }
        return of(response);
      }),
      catchError(error => {
        this.authenticationService.clearData();
        this.router.navigate(['/password-token-expired']);
        return of(error);
      }),
    );
  }
}
