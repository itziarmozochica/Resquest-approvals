import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import {
  type BaseErrorResponse,
  type BaseResponse,
  type HttpErrorResponseWithBaseError,
} from '@fz-original/app/shared/models/base-response';
import { getHttpBaseErrorResponseError } from '@fz-original/app/shared/utils/error-response.utils';
import { environment } from '@fz-original/environments/environment';
import { Observable, of, throwError } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';

import {
  modificationReservationUnknownErrorCode,
  type ModificationReservation,
  type ModificationReservationDto,
  type ModificationReservationQuery,
  type ModificationReservationRequestDto,
} from '../../models/modification-payment-link.model';
import { toModificationReservation } from '../adapters/modification-reservation.adapter';

@Injectable({ providedIn: 'root' })
export class FzModificationReservationService {
  static readonly unknownError: BaseErrorResponse = { code: modificationReservationUnknownErrorCode, message: 'errors.generic' };

  readonly #http = inject(HttpClient);

  createModificationReservation({ cartId, expiresAt, partnerId }: ModificationReservationQuery): Observable<ModificationReservation> {
    const path = `${environment.apiBaseUrl}/3.0/partners/${partnerId}/carts/${cartId}/modification-reservation/`;
    const body: ModificationReservationRequestDto = { expires_at: expiresAt };

    return this.#http.post<BaseResponse<ModificationReservationDto>>(path, body).pipe(
      catchError((error: unknown) =>
        throwError(() =>
          error instanceof HttpErrorResponse
            ? getHttpBaseErrorResponseError(error as HttpErrorResponseWithBaseError) // the endpoint answers errors with the B2B envelope or no body, the two shapes the helper reads
            : FzModificationReservationService.unknownError,
        ),
      ),
      switchMap((response: BaseResponse<ModificationReservationDto>) =>
        response.data != null
          ? of(toModificationReservation(response.data))
          : throwError((): BaseErrorResponse => response.error ?? FzModificationReservationService.unknownError),
      ),
    );
  }
}
