import { HttpClient, HttpContext, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { SKIP_FORBIDDEN_TOAST } from '@fz-original/app/shared/interceptors/skip-forbidden-toast.token';
import { SKIP_RETRY_INTERCEPTOR } from '@fz-original/app/shared/interceptors/skip-retry.token';
import { environment } from '@fz-original/environments/environment';
import { Channel } from '@fz/channel';
import { map, type Observable } from 'rxjs';

import type { TranslateTextsRequest, TranslateTextsResponse } from '../models/immersive-layout-translation.model';
import type { ImmersivePlanChannel, PlansWithChannelsResponse } from '../models/immersive-plan-channel.model';
import type { PlanviewLayout, PlanviewLayoutEnvelope } from '../models/planview-layout-envelope.model';

export interface PlanviewLayoutUpsertResponse {
  plan_id: number;
  updated_at: string;
}

@Injectable()
export class ImmersiveContentPlanService {
  readonly #http = inject(HttpClient);

  getEnvelope(partnerId: number, planId: number): Observable<PlanviewLayoutEnvelope> {
    return this.#http.get<PlanviewLayoutEnvelope>(this.#envelopeUrl(partnerId, planId));
  }

  // The marketplace is the default module, never a variant target; whitelabels are `marketplace` typed too, so only the id tells them apart.
  getPlanChannels(partnerId: number, planId: number): Observable<ImmersivePlanChannel[]> {
    const params = new HttpParams().set('plan_ids', planId).set('only_published_channels', false);
    // A failed load only hides the add entries, so a 403 must not raise the global toast.
    const context = new HttpContext().set(SKIP_FORBIDDEN_TOAST, true);
    return this.#http
      .get<PlansWithChannelsResponse>(`${environment.apiGWBaseUrl}/1.0/partners/${partnerId}/plans-with-channels`, { context, params })
      .pipe(
        map(({ data }) =>
          (data?.plans.find(plan => plan.id === planId)?.channels ?? [])
            .filter(({ channel_id }) => channel_id !== Channel.FeverMarketplace)
            .map(({ channel_id, name }) => ({ id: channel_id, name: name ?? channel_id }))
            .sort((left, right) => left.name.localeCompare(right.name)),
        ),
      );
  }

  scheduleGeneration(partnerId: number, planId: number): Observable<void> {
    return this.#http.post<void>(`${this.#envelopeUrl(partnerId, planId)}/generation`, {});
  }

  translateTexts(partnerId: number, body: TranslateTextsRequest): Observable<TranslateTextsResponse> {
    const context = new HttpContext().set(SKIP_RETRY_INTERCEPTOR, true);
    return this.#http.post<TranslateTextsResponse>(
      `${environment.apiGWBaseUrl}/1.0/partners/${partnerId}/planview-layout/translations`,
      body,
      { context },
    );
  }

  upsertLayout(partnerId: number, planId: number, layout: PlanviewLayout): Observable<PlanviewLayoutUpsertResponse> {
    return this.#http.post<PlanviewLayoutUpsertResponse>(this.#envelopeUrl(partnerId, planId), layout);
  }

  #envelopeUrl(partnerId: number, planId: number): string {
    return `${environment.apiGWBaseUrl}/1.0/partners/${partnerId}/plans/${planId}/planview-layout`;
  }
}
