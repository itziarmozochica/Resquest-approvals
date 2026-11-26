import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import type { BaseResponse } from '@fz/http-models';
import { map, type Observable } from 'rxjs';

import {
  adaptEvaluateReservationCapability,
  adaptPurchaseCloseEvaluation,
  adaptReservationCapabilityConfigurationStatus,
  adaptReservationCapabilitySettings,
  scopedOrganizationHeader,
  toEvaluateCapabilityBody,
  toPurchaseCloseParams,
  type CapabilityQuery,
  type DistributorTarget,
  type EvaluateCapabilityPayload,
  type EvaluateReservationCapabilityApi,
  type EvaluateReservationCapabilityResponse,
  type OnBehalfTarget,
  type PurchaseCloseEvaluation,
  type PurchaseCloseEvaluationApi,
  type PurchaseCloseQuery,
  type ReservationCapabilityConfigurationStatus,
  type ReservationCapabilityConfigurationStatusApi,
  type ReservationCapabilitySettings,
  type ReservationCapabilitySettingsApi,
} from './core';
import { RESERVATIONS_CONFIG } from './reservations.config';

@Injectable()
export class ReservationCapabilityClient {
  readonly #config = inject(RESERVATIONS_CONFIG);
  readonly #http = inject(HttpClient);

  evaluateCapability(
    target: DistributorTarget,
    payload: EvaluateCapabilityPayload,
  ): Observable<EvaluateReservationCapabilityResponse | null> {
    return this.#http
      .post<BaseResponse<EvaluateReservationCapabilityApi>>(
        this.#partnerUrl(target, '/reservation-capability/evaluate'),
        toEvaluateCapabilityBody(payload),
        {
          headers: scopedOrganizationHeader(target.distributorId),
        },
      )
      .pipe(map(adaptEvaluateReservationCapability));
  }

  evaluateCapabilityOnBehalf(
    target: OnBehalfTarget,
    payload: EvaluateCapabilityPayload,
  ): Observable<EvaluateReservationCapabilityResponse | null> {
    return this.#http
      .post<BaseResponse<EvaluateReservationCapabilityApi>>(
        this.#onBehalfUrl(target, '/reservation-capability/evaluate'),
        toEvaluateCapabilityBody(payload),
        {
          headers: scopedOrganizationHeader(target.actingPartnerId),
        },
      )
      .pipe(map(adaptEvaluateReservationCapability));
  }

  evaluatePurchaseClose(target: DistributorTarget, query: PurchaseCloseQuery): Observable<PurchaseCloseEvaluation | null> {
    return this.#http
      .get<BaseResponse<PurchaseCloseEvaluationApi>>(this.#partnerUrl(target, '/reservation-rules/evaluate/purchase-close'), {
        headers: scopedOrganizationHeader(target.distributorId),
        params: toPurchaseCloseParams(query),
      })
      .pipe(map(adaptPurchaseCloseEvaluation));
  }

  getCapabilityConfigurationStatus(target: DistributorTarget): Observable<ReservationCapabilityConfigurationStatus | null> {
    return this.#http
      .get<BaseResponse<ReservationCapabilityConfigurationStatusApi>>(
        this.#partnerUrl(target, '/reservation-capability/configuration-status'),
        {
          headers: scopedOrganizationHeader(target.distributorId),
        },
      )
      .pipe(map(adaptReservationCapabilityConfigurationStatus));
  }

  getCapabilitySettings(target: DistributorTarget, query: CapabilityQuery): Observable<ReservationCapabilitySettings | null> {
    return this.#http
      .get<BaseResponse<ReservationCapabilitySettingsApi>>(this.#partnerUrl(target, '/reservation-capability-settings'), {
        headers: scopedOrganizationHeader(target.distributorId),
        params: this.#capabilityParams(query),
      })
      .pipe(map(adaptReservationCapabilitySettings));
  }

  getCapabilitySettingsOnBehalf(target: OnBehalfTarget, query: CapabilityQuery): Observable<ReservationCapabilitySettings | null> {
    return this.#http
      .get<BaseResponse<ReservationCapabilitySettingsApi>>(this.#onBehalfUrl(target, '/reservation-capability-settings'), {
        headers: scopedOrganizationHeader(target.actingPartnerId),
        params: this.#capabilityParams(query),
      })
      .pipe(map(adaptReservationCapabilitySettings));
  }

  #capabilityParams(query: CapabilityQuery): Record<string, string> {
    return {
      ...(query.channelId !== undefined && query.channelId !== '' && { channel_id: query.channelId }),
      ...(query.businessType !== undefined && query.businessType !== '' && { business_type: query.businessType }),
    };
  }

  #onBehalfUrl(target: OnBehalfTarget, path: string): string {
    return `${this.#config.gatewayBaseUrl}/1.0/distributors/${target.distributorOrganizationId}/partners/${target.actingPartnerId}${path}`;
  }

  #partnerUrl(target: DistributorTarget, path: string): string {
    return `${this.#config.gatewayBaseUrl}/2.0/partners/${target.targetOrganizationId}${path}`;
  }
}
