import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import {
  InformationRequestTemplateSummary,
  InformationRequestTemplateSummaryApiDto,
  ListInformationRequestTemplatesApiData,
  mapInformationRequestTemplateSummaryDto,
} from '@fz-original/app/modules/ir-approval/information-requests/models/information-request-template.model';
import {
  mapStepperTemplateDto,
  mapStepperTemplateSummaryDto,
  mapStepperTemplateToDto,
  StepperTemplate,
  StepperTemplateApiDto,
  StepperTemplateSummary,
  StepperTemplateSummaryApiDto,
} from '@fz-original/app/modules/ir-approval/information-requests/models/stepper-template.model';
import { Observable } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

import { environment } from '../../../../environments/environment';
import { BaseResponse } from '../../../shared/models/base-response';
import { PartnerService } from '../../../shared/services/partner/partner.service';
import { ErrorResponseUtils } from '../../../shared/utils/error-response.utils';
import {
  CATALOG_META_KEY,
  CatalogMeta,
  CatalogMetaApiDto,
  CustomFieldsByTemplate,
  CustomFieldsByTemplateApiDto,
  LayoutsByTemplate,
  LayoutsByTemplateApiDto,
  mapCustomFieldToDto,
  mapLayoutToDto,
  mapMergedTemplateDto,
  mapOverrideToDto,
  mapServiceCatalogSettingsDto,
  MergedTemplate,
  MergedTemplateApiDto,
  OverridesByTemplate,
  OverridesByTemplateApiDto,
  ServiceCatalogSettings,
  ServiceCatalogSettingsApiDto,
} from '../models/service-catalog.model';

export type TypeDefinitionKind = 'IR' | 'APPROVAL';

@Injectable({ providedIn: 'root' })
export class AdminProjectManagementSettingsService {
  readonly #http = inject(HttpClient);
  readonly #partnerService = inject(PartnerService);

  getSettings(kind: TypeDefinitionKind = 'IR'): Observable<BaseResponse<ServiceCatalogSettings | null>> {
    return this.#http.get<BaseResponse<ServiceCatalogSettingsApiDto>>(this.#settingsUrl(kind)).pipe(
      map(
        response =>
          new BaseResponse<ServiceCatalogSettings | null>(
            response.data ? mapServiceCatalogSettingsDto(response.data) : null,
            response.error,
          ),
      ),
      catchError(error => ErrorResponseUtils.getErrorResponse<ServiceCatalogSettings | null>(error)),
    );
  }

  getMergedTemplate(templateKey: string, kind: TypeDefinitionKind = 'IR'): Observable<BaseResponse<MergedTemplate | null>> {
    return this.#http.get<BaseResponse<MergedTemplateApiDto>>(this.#mergedTemplateUrl(templateKey, kind)).pipe(
      map(response => new BaseResponse<MergedTemplate | null>(response.data ? mapMergedTemplateDto(response.data) : null, response.error)),
      catchError(error => ErrorResponseUtils.getErrorResponse<MergedTemplate | null>(error)),
    );
  }

  updateOverrides(
    overrides: OverridesByTemplate,
    kind: TypeDefinitionKind = 'IR',
  ): Observable<BaseResponse<ServiceCatalogSettings | null>> {
    const body: { overrides: OverridesByTemplateApiDto } = { overrides: {} };
    for (const [tk, byField] of Object.entries(overrides)) {
      body.overrides[tk] = {};
      for (const [fid, ov] of Object.entries(byField)) {
        body.overrides[tk][fid] = mapOverrideToDto(ov);
      }
    }
    return this.#http.put<BaseResponse<ServiceCatalogSettingsApiDto>>(`${this.#kindBaseUrl(kind)}/overrides/`, body).pipe(
      map(
        response =>
          new BaseResponse<ServiceCatalogSettings | null>(
            response.data ? mapServiceCatalogSettingsDto(response.data) : null,
            response.error,
          ),
      ),
      catchError(error => ErrorResponseUtils.getErrorResponse<ServiceCatalogSettings | null>(error)),
    );
  }

  updateCustomFields(
    customFields: CustomFieldsByTemplate,
    kind: TypeDefinitionKind = 'IR',
  ): Observable<BaseResponse<ServiceCatalogSettings | null>> {
    const body: { custom_fields: CustomFieldsByTemplateApiDto } = { custom_fields: {} };
    for (const [tk, list] of Object.entries(customFields)) {
      body.custom_fields[tk] = list.map(mapCustomFieldToDto);
    }
    return this.#http.put<BaseResponse<ServiceCatalogSettingsApiDto>>(`${this.#kindBaseUrl(kind)}/custom-fields/`, body).pipe(
      map(
        response =>
          new BaseResponse<ServiceCatalogSettings | null>(
            response.data ? mapServiceCatalogSettingsDto(response.data) : null,
            response.error,
          ),
      ),
      catchError(error => ErrorResponseUtils.getErrorResponse<ServiceCatalogSettings | null>(error)),
    );
  }

  updateLayouts(
    layouts: LayoutsByTemplate,
    kind: TypeDefinitionKind = 'IR',
    meta?: CatalogMeta,
  ): Observable<BaseResponse<ServiceCatalogSettings | null>> {
    const body: { layouts: Record<string, LayoutsByTemplateApiDto[string] | CatalogMetaApiDto> } = { layouts: {} };
    for (const [tk, layout] of Object.entries(layouts)) {
      body.layouts[tk] = mapLayoutToDto(layout);
    }
    if (meta && (meta.hiddenTemplateKeys.length > 0 || meta.globallyOrdered)) {
      body.layouts[CATALOG_META_KEY] = {
        hidden_template_keys: meta.hiddenTemplateKeys,
        globally_ordered_templates: meta.globallyOrdered,
      };
    }
    return this.#http.put<BaseResponse<ServiceCatalogSettingsApiDto>>(`${this.#kindBaseUrl(kind)}/layouts/`, body).pipe(
      map(
        response =>
          new BaseResponse<ServiceCatalogSettings | null>(
            response.data ? mapServiceCatalogSettingsDto(response.data) : null,
            response.error,
          ),
      ),
      catchError(error => ErrorResponseUtils.getErrorResponse<ServiceCatalogSettings | null>(error)),
    );
  }

  listTemplates(kind: TypeDefinitionKind = 'IR'): Observable<BaseResponse<InformationRequestTemplateSummary[] | null>> {
    return this.#http.get<BaseResponse<ListInformationRequestTemplatesApiData>>(this.#templatesUrl(kind)).pipe(
      map(
        response =>
          new BaseResponse<InformationRequestTemplateSummary[] | null>(
            response.data?.templates?.map(mapInformationRequestTemplateSummaryDto) ?? null,
            response.error,
          ),
      ),
      catchError(error => ErrorResponseUtils.getErrorResponse<InformationRequestTemplateSummary[]>(error)),
    );
  }

  createTemplate(label: string, kind: TypeDefinitionKind = 'IR'): Observable<BaseResponse<InformationRequestTemplateSummary | null>> {
    return this.#http.post<BaseResponse<InformationRequestTemplateSummaryApiDto>>(this.#templatesUrl(kind), { label }).pipe(
      map(
        response =>
          new BaseResponse<InformationRequestTemplateSummary | null>(
            response.data ? mapInformationRequestTemplateSummaryDto(response.data) : null,
            response.error,
          ),
      ),
      catchError(error => ErrorResponseUtils.getErrorResponse<InformationRequestTemplateSummary | null>(error)),
    );
  }

  deleteTemplate(templateKey: string, kind: TypeDefinitionKind = 'IR'): Observable<BaseResponse<{ key: string } | null>> {
    return this.#http.delete<BaseResponse<{ key: string }>>(this.#templateUrl(templateKey, kind)).pipe(
      map(response => new BaseResponse<{ key: string } | null>(response.data ?? null, response.error)),
      catchError(error => ErrorResponseUtils.getErrorResponse<{ key: string } | null>(error)),
    );
  }

  listStepperTemplates(): Observable<BaseResponse<StepperTemplateSummary[] | null>> {
    return this.#http.get<BaseResponse<{ templates: StepperTemplateSummaryApiDto[] }>>(this.#stepperBaseUrl()).pipe(
      map(
        response =>
          new BaseResponse<StepperTemplateSummary[] | null>(
            response.data?.templates?.map(mapStepperTemplateSummaryDto) ?? null,
            response.error,
          ),
      ),
      catchError(error => ErrorResponseUtils.getErrorResponse<StepperTemplateSummary[] | null>(error)),
    );
  }

  createStepperTemplate(label: string): Observable<BaseResponse<StepperTemplateSummary | null>> {
    return this.#http.post<BaseResponse<StepperTemplateSummaryApiDto>>(this.#stepperBaseUrl(), { label }).pipe(
      map(
        response =>
          new BaseResponse<StepperTemplateSummary | null>(
            response.data ? mapStepperTemplateSummaryDto(response.data) : null,
            response.error,
          ),
      ),
      catchError(error => ErrorResponseUtils.getErrorResponse<StepperTemplateSummary | null>(error)),
    );
  }

  deleteStepperTemplate(key: string): Observable<BaseResponse<{ key: string } | null>> {
    return this.#http.delete<BaseResponse<{ key: string }>>(this.#stepperKeyUrl(key)).pipe(
      map(response => new BaseResponse<{ key: string } | null>(response.data ?? null, response.error)),
      catchError(error => ErrorResponseUtils.getErrorResponse<{ key: string } | null>(error)),
    );
  }

  getStepperTemplate(key: string): Observable<BaseResponse<StepperTemplate | null>> {
    return this.#http.get<BaseResponse<StepperTemplateApiDto>>(this.#stepperKeyUrl(key)).pipe(
      map(
        response => new BaseResponse<StepperTemplate | null>(response.data ? mapStepperTemplateDto(response.data) : null, response.error),
      ),
      catchError(error => ErrorResponseUtils.getErrorResponse<StepperTemplate | null>(error)),
    );
  }

  updateStepperTemplate(template: StepperTemplate): Observable<BaseResponse<StepperTemplate | null>> {
    return this.#http.put<BaseResponse<StepperTemplateApiDto>>(this.#stepperKeyUrl(template.key), mapStepperTemplateToDto(template)).pipe(
      map(
        response => new BaseResponse<StepperTemplate | null>(response.data ? mapStepperTemplateDto(response.data) : null, response.error),
      ),
      catchError(error => ErrorResponseUtils.getErrorResponse<StepperTemplate | null>(error)),
    );
  }

  #kindBaseUrl(kind: TypeDefinitionKind): string {
    const segment = kind === 'APPROVAL' ? 'approval-catalog' : 'information-request-catalog';
    return `${environment.apiBaseUrl}/3.0/partners/${this.#partnerService.getPartner()?.id}/settings/${segment}`;
  }

  #settingsUrl(kind: TypeDefinitionKind): string {
    return `${this.#kindBaseUrl(kind)}/settings/`;
  }

  #templatesUrl(kind: TypeDefinitionKind): string {
    return `${this.#kindBaseUrl(kind)}/templates/`;
  }

  #templateUrl(templateKey: string, kind: TypeDefinitionKind): string {
    return `${this.#templatesUrl(kind)}${encodeURIComponent(templateKey)}/`;
  }

  #mergedTemplateUrl(templateKey: string, kind: TypeDefinitionKind): string {
    return `${this.#templateUrl(templateKey, kind)}merged/`;
  }

  #stepperBaseUrl(): string {
    return `${environment.apiBaseUrl}/3.0/partners/${this.#partnerService.getPartner()?.id}/settings/projects/stepper-templates/`;
  }

  #stepperKeyUrl(key: string): string {
    return `${this.#stepperBaseUrl()}${encodeURIComponent(key)}/`;
  }
}
