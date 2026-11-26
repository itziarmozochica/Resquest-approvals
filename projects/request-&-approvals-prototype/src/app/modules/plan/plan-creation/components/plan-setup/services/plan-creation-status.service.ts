import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { PlanType } from '@fz-original/app/modules/event-settings/models/general-section.enum';
import { AuctionSettingsService } from '@fz-original/app/modules/plan/plan-creation/components/plan-settings-edit/services/auction/auction-settings.service';
import { LinkOutSettingsService } from '@fz-original/app/modules/plan/plan-creation/components/plan-settings-edit/services/link-out/link-out-settings.service';
import { PrizeDrawSettingsService } from '@fz-original/app/modules/plan/plan-creation/components/plan-settings-edit/services/prize-draw/prize-draw-settings.service';
import { StandardSettingsService } from '@fz-original/app/modules/plan/plan-creation/components/plan-settings-edit/services/standard/standard-settings.service';
import { WaitlistSettingsService } from '@fz-original/app/modules/plan/plan-creation/components/plan-settings-edit/services/waitlist/waitlist-settings.service';
import { PlanCreationStatusData, PlanCreationStatusResponse } from '@fz-original/app/shared/models/plan/plan-creation-status.model';
import { environment } from '@fz-original/environments/environment';
import { Observable, of, switchMap } from 'rxjs';
import { map } from 'rxjs/operators';

import { PlanSettingsFetcher } from './plan-settings-fetcher';

@Injectable({
  providedIn: 'root',
})
export class PlanCreationStatusService {
  #auctionSettingsService = inject(AuctionSettingsService);
  #fetchersByPlanType: Map<string, PlanSettingsFetcher>;
  #http = inject(HttpClient);
  #linkOutSettingsService = inject(LinkOutSettingsService);
  #prizeDrawSettingsService = inject(PrizeDrawSettingsService);
  #standardSettingsService = inject(StandardSettingsService);
  #waitlistSettingsService = inject(WaitlistSettingsService);

  constructor() {
    const planTypesUsingStandardSettings = [
      PlanType.standard,
      PlanType.showcase,
      PlanType.movie,
      PlanType.deposit,
      PlanType.giftCard,
      PlanType.giveaway,
      PlanType.growth,
      PlanType.redeemNow,
    ];

    this.#fetchersByPlanType = new Map<string, PlanSettingsFetcher>([
      [this.#auctionSettingsService.planType, this.#auctionSettingsService],
      [this.#linkOutSettingsService.planType, this.#linkOutSettingsService],
      [this.#prizeDrawSettingsService.planType, this.#prizeDrawSettingsService],
      [this.#waitlistSettingsService.planType, this.#waitlistSettingsService],
      ...planTypesUsingStandardSettings.map(planType => [planType, this.#standardSettingsService] as [string, PlanSettingsFetcher]),
    ]);
  }

  getPlanCreationStatus(partnerId: number, planId: number): Observable<PlanCreationStatusData> {
    const path = this.#getDetailUrl(partnerId, planId);

    return this.#http.get<PlanCreationStatusResponse>(path).pipe(
      map((data: PlanCreationStatusResponse) => ({
        id: data.id,
        partnerId: data.partner_id,
        name: data.name,
        type: data.type,
        description: data.description,
        shortDescription: data.short_description,
        venues: data.venues,
        gallery: data.gallery,
        absolute_url: data.absolute_url,
        launchCode: data.launch_code ?? null,
        hasDeclarativeInventory: data.has_declarative_inventory === true,
      })),
      switchMap(planData => {
        const fetcher = this.#fetchersByPlanType.get(planData.type);

        if (fetcher) {
          return fetcher.fetchSettings(partnerId, planId).pipe(
            map(config => ({
              ...planData,
              planTypeSettings: config,
            })),
          );
        }

        return of(planData);
      }),
    );
  }

  #getDetailUrl(partnerId: number, planId: number): string {
    return `${environment.apiBaseUrl}/partners/${partnerId}/plans/${planId}/`;
  }
}
