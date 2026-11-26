import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { environment } from '@fz-original/environments/environment';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

import { BaseResponse } from '../../../shared/models/base-response';
import { ErrorResponseUtils } from '../../../shared/utils/error-response.utils';
import { AgreementRequirement } from '../models/agreement-requirement.model';
import { NewRequirement } from '../models/new-requirement.model';
import { RequirementPatch } from '../models/requirement-patch.model';
import { AgreementRequirementAdapter } from './adapters/agreement-requirement.adapter';
import { AgreementRequirementDto } from './dtos/agreement-requirement.dto';

interface ItemDataDto {
  agreement_requirement: AgreementRequirementDto;
}

interface ListDataDto {
  agreement_requirements: AgreementRequirementDto[];
}

@Injectable({ providedIn: 'root' })
export class AgreementRequirementsService {
  readonly #adapter = inject(AgreementRequirementAdapter);
  readonly #http = inject(HttpClient);

  create(partnerId: number, input: NewRequirement): Observable<AgreementRequirement> {
    const url = this.#url(`${partnerId}/agreement-requirements/`);
    return this.#http.post<BaseResponse<ItemDataDto>>(url, this.#adapter.toCreateDto(input)).pipe(
      map(res => this.#adapter.fromApi(this.#unwrapItem(res))),
      catchError(err => this.#rethrow(err)),
    );
  }

  list(partnerId: number, mainPlanId: number): Observable<AgreementRequirement[]> {
    const url = this.#url(`${partnerId}/main-plans/${mainPlanId}/agreement-requirements/`);
    return this.#http.get<BaseResponse<ListDataDto>>(url).pipe(
      map(res => (res.data?.agreement_requirements ?? []).map(dto => this.#adapter.fromApi(dto))),
      catchError(err => this.#rethrow(err)),
    );
  }

  patch(partnerId: number, id: number, patch: RequirementPatch): Observable<AgreementRequirement> {
    const url = this.#url(`${partnerId}/agreement-requirements/${id}/`);
    return this.#http.patch<BaseResponse<ItemDataDto>>(url, this.#adapter.toPatchDto(patch)).pipe(
      map(res => this.#adapter.fromApi(this.#unwrapItem(res))),
      catchError(err => this.#rethrow(err)),
    );
  }

  setActive(partnerId: number, id: number, active: boolean): Observable<AgreementRequirement> {
    const url = this.#url(`${partnerId}/agreement-requirements/${id}/`);
    return this.#http.patch<BaseResponse<ItemDataDto>>(url, this.#adapter.toActiveDto(active)).pipe(
      map(res => this.#adapter.fromApi(this.#unwrapItem(res))),
      catchError(err => this.#rethrow(err)),
    );
  }

  #rethrow(err: unknown): Observable<never> {
    if (err instanceof HttpErrorResponse) {
      return throwError(() => ErrorResponseUtils.getErrorResponseError(err));
    }
    const message = err instanceof Error ? err.message : 'errors.generic';
    return throwError(() => ({ code: 'UNKNOWN_ERROR', error: err, message }));
  }

  #unwrapItem(res: BaseResponse<ItemDataDto>): AgreementRequirementDto {
    const item = res.data?.agreement_requirement;
    if (item == null) {
      throw new Error('Empty agreement_requirement envelope in fever2 response');
    }
    return item;
  }

  #url(path: string): string {
    return `${environment.apiBaseUrl}/3.0/partners/${path}`;
  }
}
