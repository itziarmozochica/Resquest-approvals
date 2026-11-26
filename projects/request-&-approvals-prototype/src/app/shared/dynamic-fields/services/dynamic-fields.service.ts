import { HttpClient, HttpContext } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { BaseResponseDTO } from '@fz-original/app/shared/models/base-response';
import { environment } from '@fz-original/environments/environment';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { SKIP_FORBIDDEN_TOAST } from '../../interceptors/skip-forbidden-toast.token';
import { toDynamicFields, toWriteDynamicFieldsPayload } from '../adapters/dynamic-fields.adapter';
import { DynamicFieldEntity } from '../enums/dynamic-field-entity.enum';
import { DynamicFieldsResponse } from '../models/dynamic-fields-response.model';
import { DynamicFieldPlanEntity, DynamicFields, DynamicFieldValueWrite } from '../models/dynamic-fields.model';

@Injectable({ providedIn: 'root' })
export class DynamicFieldsService {
  readonly #http = inject(HttpClient);

  getPlanEntityDynamicFields(partnerId: number, planId: number, entity: DynamicFieldPlanEntity): Observable<DynamicFields> {
    return this.#getDynamicFields(`${this.#dynamicFieldsUrl(partnerId, planId)}/${entity}/`);
  }

  getPlanSessionTypesDynamicFields(partnerId: number, planId: number): Observable<DynamicFields> {
    return this.#getDynamicFields(`${this.#dynamicFieldsUrl(partnerId, planId)}/${DynamicFieldEntity.SessionType}/`);
  }

  getSessionTypeDynamicFields(partnerId: number, planId: number, sessionTypeId: number): Observable<DynamicFields> {
    return this.#getDynamicFields(`${this.#dynamicFieldsUrl(partnerId, planId)}/${DynamicFieldEntity.SessionType}/${sessionTypeId}/`);
  }

  updatePlanEntityDynamicFields(
    partnerId: number,
    planId: number,
    entity: DynamicFieldPlanEntity,
    fields: DynamicFieldValueWrite[],
  ): Observable<void> {
    return this.#updateDynamicFields(`${this.#dynamicFieldsUrl(partnerId, planId)}/${entity}/`, fields);
  }

  updateSessionTypeDynamicFields(
    partnerId: number,
    planId: number,
    sessionTypeId: number,
    fields: DynamicFieldValueWrite[],
  ): Observable<void> {
    return this.#updateDynamicFields(
      `${this.#dynamicFieldsUrl(partnerId, planId)}/${DynamicFieldEntity.SessionType}/${sessionTypeId}/`,
      fields,
    );
  }

  #dynamicFieldsUrl(partnerId: number, planId: number): string {
    return `${environment.apiBaseUrl}/3.0/partners/${partnerId}/plans/${planId}/dynamic-fields`;
  }

  #getDynamicFields(url: string): Observable<DynamicFields> {
    return this.#http
      .get<BaseResponseDTO<DynamicFieldsResponse>>(url, { context: new HttpContext().set(SKIP_FORBIDDEN_TOAST, true) })
      .pipe(map(response => toDynamicFields(this.#unwrap(response))));
  }

  #unwrap<T>(response: BaseResponseDTO<T>): T {
    if (!response.data) throw response.error ?? new Error('Empty response');
    return response.data;
  }

  #updateDynamicFields(url: string, fields: DynamicFieldValueWrite[]): Observable<void> {
    return this.#http.patch<void>(url, toWriteDynamicFieldsPayload(fields));
  }
}
