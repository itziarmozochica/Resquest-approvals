import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { environment } from '@fz-original/environments/environment';
import { Observable, of } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';

import { BaseResponse } from '../../../../shared/models/base-response';
import { PartnerChannel, PartnerChannelsResponseDTO } from '../../models/partner-channels.model';
import { PlanSessionType, PlanSessionTypesResponseDTO, UngroupedSessionTypeDTO } from '../../models/plan-session-types.model';
import {
  PlanTranslation,
  PlanTranslationDTO,
  PlanTranslationsResponseDTO,
  SavePlanTranslationPersistedBaseline,
  SavePlanTranslationRequestDTO,
  TranslationEntity,
} from '../../models/plan-translation.model';
import {
  SessionTypeTranslation,
  SessionTypeTranslationDTO,
  SessionTypeTranslationsResponseDTO,
} from '../../models/session-type-translation.model';
import { isHtmlMeaningful, isTranslationTextPopulated } from '../../utils/default-translation-field-catalog';
import { resolveOptionalTextFieldForSave } from '../../utils/resolve-optional-translation-field-for-save.util';
import { ContentSchemaAdapter } from '../content-schema/content-schema.adapter';
import { PlanContentService } from '../plan-content/plan-content.service';

@Injectable({
  providedIn: 'root',
})
export class PlanTranslationsService {
  #http = inject(HttpClient);
  readonly #contentSchemaAdapter = inject(ContentSchemaAdapter);
  readonly #planContentService = inject(PlanContentService);

  deleteChannelTranslations(partnerId: number, planId: number, channelId: string, language?: string): Observable<void> {
    const url = `${environment.apiGWBaseUrl}/1.0/partners/${partnerId}/plans/${planId}/translations`;
    const body = {
      entity: TranslationEntity.MAIN_PLAN,
      entity_id: planId,
      channel_id: channelId,
      // The `b2b-partners` gateway rejects a language-less delete, so callers scope it to one language.
      ...(language ? { language } : {}),
    };
    return this.#http.request<void>('delete', url, { body }).pipe(tap(() => this.#planContentService.invalidateContentSchemaCache(planId)));
  }

  deletePlanTranslation(partnerId: number, planId: number, language: string, channelId: string | null): Observable<void> {
    const url = `${environment.apiGWBaseUrl}/1.0/partners/${partnerId}/plans/${planId}/translations`;
    const body = {
      entity: TranslationEntity.MAIN_PLAN,
      entity_id: planId,
      channel_id: channelId,
      language,
    };
    return this.#http.request<void>('delete', url, { body }).pipe(tap(() => this.#planContentService.invalidateContentSchemaCache(planId)));
  }

  deleteSessionTypeTranslation(
    partnerId: number,
    planId: number,
    sessionTypeId: number,
    language: string,
    channelId: string | null,
  ): Observable<void> {
    const url = `${environment.apiGWBaseUrl}/1.0/partners/${partnerId}/plans/${planId}/translations`;
    const body = {
      entity: TranslationEntity.SESSION_TYPE,
      entity_id: sessionTypeId,
      channel_id: channelId,
      language,
    };
    return this.#http.request<void>('delete', url, { body });
  }

  getPlanTranslations(partnerId: number, entity: string, entityId: number, language?: string): Observable<BaseResponse<PlanTranslation[]>> {
    const url = `${environment.apiBaseUrl}/3.0/partners/${partnerId}/translations/`;
    const params = {
      entity,
      entity_id: entityId.toString(),
      ...(language ? { language } : {}),
    };

    return this.#http.get<PlanTranslationsResponseDTO>(url, { params }).pipe(
      map((response: PlanTranslationsResponseDTO) => {
        if (response.error) {
          return new BaseResponse<PlanTranslation[]>(null, response.error);
        }

        if (!response.data || !response.data.translations || !Array.isArray(response.data.translations)) {
          return new BaseResponse<PlanTranslation[]>([], null);
        }

        const translations: PlanTranslation[] = response.data.translations.map((dto: PlanTranslationDTO) => this.#mapDtoToModel(dto));
        return new BaseResponse<PlanTranslation[]>(translations, null);
      }),
    );
  }

  savePlanTranslation(
    partnerId: number,
    planId: number,
    translation: PlanTranslation,
    options?: { persisted?: SavePlanTranslationPersistedBaseline },
  ): Observable<void> {
    const url = `${environment.apiGWBaseUrl}/1.0/partners/${partnerId}/plans/${planId}/translations`;
    const dto = this.#mapModelToSaveDto(planId, translation, options?.persisted);

    return this.#http.post<void>(url, dto).pipe(tap(() => this.#planContentService.invalidateContentSchemaCache(planId)));
  }

  /**
   * Persists a single description-component translation, upserted as `verified`.
   * Unused by the UI, which syncs them in bulk through `savePlanTranslation`.
   */
  saveContentSchemaTranslation(
    partnerId: number,
    planId: number,
    schemaId: string,
    body: { code: string; value: string; language: string },
  ): Observable<void> {
    const url = `${environment.apiBaseUrl}/3.0/partners/${partnerId}/plans/${planId}/content-schema/${schemaId}/translations/`;
    return this.#http.post<void>(url, body).pipe(tap(() => this.#planContentService.invalidateContentSchemaCache(planId)));
  }
  getPartnerAvailableChannels(partnerId: number): Observable<PartnerChannel[]> {
    const url = `${environment.apiGWBaseUrl}/1.0/partners/${partnerId}/channels`;
    return this.#http.get<PartnerChannelsResponseDTO>(url).pipe(
      map((response: PartnerChannelsResponseDTO) => {
        if (!Array.isArray(response?.data?.channels)) {
          return [];
        }
        return [...response.data.channels];
      }),
      catchError(() => {
        return of([]);
      }),
    );
  }

  getPlanSessionTypes(partnerId: number, planId: number): Observable<PlanSessionType[]> {
    const url = `${environment.apiBaseUrl}/3.0/partners/${partnerId}/plans/${planId}/session-types/`;
    const params = { is_archived: 'false' };
    return this.#http.get<PlanSessionTypesResponseDTO>(url, { params }).pipe(
      map((response: PlanSessionTypesResponseDTO) => {
        if (!response?.data) {
          return [];
        }
        const { ungrouped_session_types, session_type_groups } = response.data;
        const fromUngrouped = Array.isArray(ungrouped_session_types)
          ? ungrouped_session_types.map(st => this.#mapSessionTypeDtoToPlanSessionType(st))
          : [];
        const fromGroups = Array.isArray(session_type_groups)
          ? session_type_groups.flatMap(group =>
              Array.isArray(group.session_types) ? group.session_types.map(st => this.#mapSessionTypeDtoToPlanSessionType(st)) : [],
            )
          : [];
        return [...fromUngrouped, ...fromGroups];
      }),
      catchError(() => {
        return of([]);
      }),
    );
  }

  getSessionTypeTranslations(partnerId: number, entityId: number): Observable<BaseResponse<SessionTypeTranslation[]>> {
    const url = `${environment.apiBaseUrl}/3.0/partners/${partnerId}/translations/`;
    const params = {
      entity: TranslationEntity.SESSION_TYPE,
      entity_id: entityId.toString(),
    };
    return this.#http.get<SessionTypeTranslationsResponseDTO>(url, { params }).pipe(
      map((response: SessionTypeTranslationsResponseDTO) => {
        if (response.error) {
          return new BaseResponse<SessionTypeTranslation[]>(null, response.error);
        }
        if (!response.data?.translations || !Array.isArray(response.data.translations)) {
          return new BaseResponse<SessionTypeTranslation[]>([], null);
        }
        const translations = response.data.translations.map((dto: SessionTypeTranslationDTO) =>
          this.#mapSessionTypeTranslationDtoToModel(dto),
        );
        return new BaseResponse<SessionTypeTranslation[]>(translations, null);
      }),
    );
  }

  saveSessionTypeTranslation(
    partnerId: number,
    planId: number,
    entityId: number,
    language: string,
    channelId: string | null,
    data: { label: string; details: string; instructions: string },
  ): Observable<void> {
    const url = `${environment.apiGWBaseUrl}/1.0/partners/${partnerId}/plans/${planId}/translations`;
    const body = {
      entity: TranslationEntity.SESSION_TYPE,
      context: {
        entity_id: entityId,
        channel_id: channelId,
        language,
      },
      data: {
        label: data.label,
        details: data.details,
        instructions: data.instructions,
      },
    };
    return this.#http.post<void>(url, body);
  }

  #mapDtoToModel(dto: PlanTranslationDTO): PlanTranslation {
    return {
      channelId: dto.context.channel_id,
      language: dto.context.language,
      name: dto.data.name,
      description: dto.data.description,
      labelFormat: dto.data.label_format ?? '',
      mandatoryPurchaseTerms: dto.data.mandatory_purchase_terms ?? '',
      shortDescription: dto.data.short_description ?? '',
    };
  }

  #mapModelToSaveDto(
    planId: number,
    model: PlanTranslation,
    persisted?: SavePlanTranslationPersistedBaseline,
  ): SavePlanTranslationRequestDTO {
    const data: SavePlanTranslationRequestDTO['data'] = {
      name: model.name,
      description: model.description,
    };
    const labelFormat = resolveOptionalTextFieldForSave(model.labelFormat, persisted?.labelFormat, isTranslationTextPopulated);
    if (labelFormat !== undefined) {
      data.label_format = labelFormat;
    }
    const shortDescription = resolveOptionalTextFieldForSave(
      model.shortDescription,
      persisted?.shortDescription,
      isTranslationTextPopulated,
    );
    if (shortDescription !== undefined) {
      data.short_description = shortDescription;
    }
    if (isHtmlMeaningful(model.mandatoryPurchaseTerms)) {
      data.mandatory_purchase_terms = model.mandatoryPurchaseTerms;
    }
    const dto: SavePlanTranslationRequestDTO = {
      entity: 'main_plan',
      context: {
        entity_id: planId,
        channel_id: model.channelId,
        language: model.language,
      },
      data,
    };
    if (model.contentSchema !== undefined) {
      dto.additional_data = {
        content_schema: this.#contentSchemaAdapter.toApi(model.contentSchema),
      };
    }
    return dto;
  }

  #mapSessionTypeDtoToPlanSessionType(st: UngroupedSessionTypeDTO): PlanSessionType {
    return {
      id: st.id,
      label: st.label ?? '',
      details: st.details ?? '',
      instructions: st.instructions ?? '',
      channels: (st.channels ?? []).map(c => c.channel_id),
      published: st.published ?? false,
    };
  }

  #mapSessionTypeTranslationDtoToModel(dto: SessionTypeTranslationDTO): SessionTypeTranslation {
    return {
      channelId: dto.context.channel_id,
      details: dto.data.details ?? '',
      entityId: dto.context.entity_id,
      instructions: dto.data.instructions ?? '',
      label: dto.data.label ?? '',
      language: dto.context.language,
    };
  }
}
