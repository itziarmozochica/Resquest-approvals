import { HttpClient, HttpContext, HttpErrorResponse, HttpStatusCode } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { Observable, of, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

import { environment } from '../../../../../environments/environment';
import { SKIP_FORBIDDEN_TOAST } from '../../../../shared/interceptors/skip-forbidden-toast.token';
import { BaseResponse } from '../../../../shared/models/base-response';
import { PlanDetail } from '../../../../shared/models/plan/plan-detail.model';
import { PlanDetailService } from '../../../../shared/services/plan/plan-detail.service';
import { ErrorResponseUtils } from '../../../../shared/utils/error-response.utils';
import { DeclarativeInventoryStatus } from '../../models/declarative-inventory.model';
import { toDeclarativeInventoryStatus } from '../adapters/declarative-inventory.adapter';
import { DeclarativeInventoryStatusDto, UpdateDeclarativeInventoryRequestDto } from '../dtos/declarative-inventory.dto';

@Injectable({
  providedIn: 'root',
})
export class DeclarativeInventoryService {
  readonly #http = inject(HttpClient);
  readonly #planDetailService = inject(PlanDetailService);

  getDeclarativeInventoryStatus(partnerId: number, planId: number): Observable<boolean> {
    return this.#planDetailService
      .getPlanDetail(partnerId, planId)
      .pipe(map((planDetail: PlanDetail): boolean => planDetail.hasDeclarativeInventory === true));
  }

  updateDeclarativeInventory(partnerId: number, planId: number, enabled: boolean): Observable<DeclarativeInventoryStatus> {
    const body: UpdateDeclarativeInventoryRequestDto = { enabled };
    const context = new HttpContext().set(SKIP_FORBIDDEN_TOAST, true);

    return this.#http
      .put<BaseResponse<DeclarativeInventoryStatusDto>>(this.#getDeclarativeInventoryUrl(partnerId, planId), body, { context })
      .pipe(
        catchError((error: HttpErrorResponse) => {
          const conflictResponse = error.error as BaseResponse<DeclarativeInventoryStatusDto> | null;
          if (error.status === HttpStatusCode.Conflict && conflictResponse?.data != null) {
            return of(conflictResponse);
          }

          return throwError(() => ErrorResponseUtils.getErrorResponseError(error));
        }),
        map((response: BaseResponse<DeclarativeInventoryStatusDto>): DeclarativeInventoryStatus => {
          if (response.data == null) {
            throw response.error ?? new Error('No data in response');
          }

          return toDeclarativeInventoryStatus(response.data);
        }),
      );
  }

  #getDeclarativeInventoryUrl(partnerId: number, planId: number): string {
    return `${environment.apiBaseUrl}/3.0/partners/${partnerId}/plans/${planId}/declarative-inventory/`;
  }
}
