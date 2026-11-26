import { HttpClient, HttpContext, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';

import { Observable, of, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

import { environment } from '../../../../../environments/environment';
import { SKIP_RETRY_INTERCEPTOR } from '../../../../shared/interceptors/skip-retry.token';
import { BaseResponse } from '../../../../shared/models/base-response';
import { PartnerService } from '../../../../shared/services/partner/partner.service';
import { ErrorResponseUtils } from '../../../../shared/utils/error-response.utils';
import {
  ActivityPackMaxCapacity,
  ActivityPackMaxCapacityApiResponse,
} from '../../../asset-based/assets-hub-detail/components/assets-hub-packs/models/assets-hub-pack.model';
import {
  CapacityTemplate,
  CapacityTemplateApiGetResponse,
  CapacityTemplateApiUpdateResponse,
  CapacityTemplateUpdateData,
  CapacityTemplateUpdateRequestBody,
} from '../../shared/models/capacity-template.model';
import { CapacityTemplateGetAdapter } from './capacity-template-get.adapter';
import { CapacityTemplateUpdateAdapter } from './capacity-template-update.adapter';

@Injectable({
  providedIn: 'root',
})
export class CapacityTemplateService {
  constructor(
    private httpClient: HttpClient,
    private partnerService: PartnerService,
    private capacityTemplateGetAdapter: CapacityTemplateGetAdapter,
    private capacityTemplateUpdateAdapter: CapacityTemplateUpdateAdapter,
  ) {}

  getCapacityTemplates(planId: number): Observable<CapacityTemplate[]> {
    const url = this.getCapacityTemplatesUrl(planId);

    return this.httpClient.get<CapacityTemplateApiGetResponse>(url).pipe(
      map((response: CapacityTemplateApiGetResponse) => {
        const adaptedResponse = this.capacityTemplateGetAdapter.fromApi(response);
        return adaptedResponse;
      }),
      catchError(error => throwError(() => ErrorResponseUtils.getErrorResponseError(error))),
    );
  }

  upsertCapacityTemplate(planId: number, capacityTemplate: CapacityTemplate): Observable<BaseResponse<CapacityTemplateUpdateData | null>> {
    const url = this.getCapacityTemplatesUrl(planId);
    const requestBody: CapacityTemplateUpdateRequestBody = this.capacityTemplateUpdateAdapter.toApi(capacityTemplate);

    return this.httpClient.put<CapacityTemplateApiUpdateResponse>(url, requestBody).pipe(
      map((response: CapacityTemplateApiUpdateResponse) => {
        const adaptedResponse = this.capacityTemplateUpdateAdapter.fromApi(response);
        return adaptedResponse;
      }),
      catchError(error => ErrorResponseUtils.getErrorResponse<CapacityTemplateUpdateData>(error)),
    );
  }

  deleteCapacityTemplate(planId: number, templateId: string): Observable<void> {
    const url = `${this.getCapacityTemplatesUrl(planId)}${templateId}/`;
    // A retried DELETE would answer 404 once the first attempt went through.
    const context = new HttpContext().set(SKIP_RETRY_INTERCEPTOR, true);

    return this.httpClient
      .delete<void>(url, { context })
      .pipe(catchError(error => throwError(() => ErrorResponseUtils.getErrorResponseError(error))));
  }

  getActivityPacksMaxCapacity(capacityTemplates: CapacityTemplate[]): Observable<ActivityPackMaxCapacity[]> {
    const uniquePackIds = new Set<number>();

    for (const template of capacityTemplates) {
      for (const group of template.groups) {
        if (group.assetActivityPackId != null) {
          uniquePackIds.add(group.assetActivityPackId);
        }
      }
    }

    if (uniquePackIds.size === 0) {
      return of([]);
    }

    const partnerId = this.partnerService.getPartner()?.id;
    if (!partnerId) {
      return throwError(() => new Error('No partner available'));
    }

    let params = new HttpParams();
    for (const packId of uniquePackIds) {
      params = params.append('activity_pack_ids', packId);
    }

    const baseUrl = environment.apiBaseUrl;
    return this.httpClient
      .get<ActivityPackMaxCapacityApiResponse>(`${baseUrl}/3.0/partners/${partnerId}/activity_packs/max-capacity/`, { params })
      .pipe(
        map(response => response.data ?? []),
        catchError(error => throwError(() => ErrorResponseUtils.getErrorResponseError(error))),
      );
  }

  private getCapacityTemplatesUrl(planId: number): string {
    const baseUrl = environment.apiBaseUrl;
    const partner = this.partnerService.getPartner();
    if (!partner?.id) {
      throw new Error('No partner available');
    }
    return `${baseUrl}/3.0/partners/${partner.id}/plans/${planId}/capacity-templates/`;
  }
}
