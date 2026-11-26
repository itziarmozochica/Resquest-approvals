import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, ResolveFn, Router } from '@angular/router';

import { Observable, of } from 'rxjs';
import { catchError, mergeMap } from 'rxjs/operators';

import { AuthenticationService } from '../../../core/authentication/authentication.service';
import { SpinnerService } from '../../../shared/layout/spinner/spinner.service';
import { BaseResponse } from '../../../shared/models/base-response';
import { NfcPinTokenValidation } from './nfc-pin-token-validation.model';

export const setNfcPinFormResolver: ResolveFn<BaseResponse<NfcPinTokenValidation | null>> = (
  route: ActivatedRouteSnapshot,
): Observable<BaseResponse<NfcPinTokenValidation | null>> => {
  const authenticationService = inject(AuthenticationService);
  const router = inject(Router);
  const spinnerService = inject(SpinnerService);

  spinnerService.show();
  return authenticationService.validateNfcPinToken(route.queryParams.token).pipe(
    mergeMap(response => {
      authenticationService.clearData();
      if (!response?.data) {
        router.navigate(['/nfc-pin-token-expired']);
      }
      return of(response);
    }),
    catchError(error => {
      authenticationService.clearData();
      router.navigate(['/nfc-pin-token-expired']);
      return of(error);
    }),
  );
};
