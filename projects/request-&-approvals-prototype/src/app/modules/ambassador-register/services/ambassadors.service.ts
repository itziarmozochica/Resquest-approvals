import { HttpClient, HttpResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { TranslateService } from '@ngx-translate/core';
import { Observable } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

import { environment } from '../../../../environments/environment';
import { BaseResponse, HttpErrorResponseWithBaseError } from '../../../shared/models/base-response';
import { ErrorResponseUtils, getHttpBaseErrorResponseError } from '../../../shared/utils/error-response.utils';
import { AmbassadorRegisterForm, AmbassadorRegisterFormResponse } from './ambassador-register.model';

@Injectable({
  providedIn: 'root',
})
export class AmbassadorsService {
  #httpClient = inject(HttpClient);
  #translate = inject(TranslateService);

  createAmbassador(planId: number, body: AmbassadorRegisterForm): Observable<BaseResponse<AmbassadorRegisterFormResponse>> {
    const path = `${environment.apiGWBaseUrl}/1.0/plans/${planId}/ambassadors`;
    const ambassador = {
      name: body.fullName,
      email: body.email,
      language: this.#translate.currentLang,
    };

    return this.#httpClient.post<BaseResponse<AmbassadorRegisterFormResponse>>(path, ambassador, { observe: 'response' }).pipe(
      map((response: HttpResponse<BaseResponse<AmbassadorRegisterFormResponse>>) => {
        if (response.status === 201 && response.body?.data) {
          return new BaseResponse(response.body.data, null);
        }

        if (response.body?.error) {
          throw ErrorResponseUtils.getErrorResponseError(response.body.error);
        }
        throw ErrorResponseUtils.getErrorResponseError({ error: { error: {} } });
      }),
      catchError((error: HttpErrorResponseWithBaseError) => {
        throw getHttpBaseErrorResponseError(error);
      }),
    );
  }

  createAmbassadorFromProgram(programId: string, body: AmbassadorRegisterForm): Observable<BaseResponse<AmbassadorRegisterFormResponse>> {
    const path = `${environment.apiGWBaseUrl}/1.0/ambassador-programs/${programId}/ambassadors`;
    const ambassador = {
      name: body.fullName,
      email: body.email,
      language: this.#translate.currentLang,
    };

    return this.#httpClient.post<BaseResponse<AmbassadorRegisterFormResponse>>(path, ambassador, { observe: 'response' }).pipe(
      map((response: HttpResponse<BaseResponse<AmbassadorRegisterFormResponse>>) => {
        if (response.status === 201 && response.body?.data) {
          return new BaseResponse(response.body.data, null);
        }

        if (response.body?.error) {
          throw ErrorResponseUtils.getErrorResponseError(response.body.error);
        }
        throw ErrorResponseUtils.getErrorResponseError({ error: { error: {} } });
      }),
      catchError((error: HttpErrorResponseWithBaseError) => {
        throw getHttpBaseErrorResponseError(error);
      }),
    );
  }
}
