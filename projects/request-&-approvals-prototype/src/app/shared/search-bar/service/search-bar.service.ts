/* eslint-disable @typescript-eslint/naming-convention */
import { inject, Injectable, Signal, WritableSignal } from '@angular/core';

import { Observable, of, ReplaySubject } from 'rxjs';
import { catchError, filter, map, take, tap } from 'rxjs/operators';

import { BaseResponse } from '../../models/base-response';
import { PlanStatus } from '../../models/plan/plan-status.enum';
import { Plan } from '../../models/plan/plan.model';
import { DistributorTargetService } from '../../services/distributor/distributor-target.service';
import { ErrorResponseUtils } from '../../utils/error-response.utils';
import { PlanOption } from '../models/plan-option.model';
import { SearchBarOptions } from '../models/search-bar.options';
import { SearchBarOptionsService } from './search-bar-options.service';
import { SearchBarAdapter } from './search-bar.adapter';

type SearchBarResponse = BaseResponse<SearchBarOptions | null>;

@Injectable({
  providedIn: 'root',
})
export class SearchBarService {
  readonly #distributorTarget = inject(DistributorTargetService);
  #planListByPartner: Map<string, ReplaySubject<SearchBarResponse>> = new Map();
  #planListByPartnerAndChannel: Map<string, ReplaySubject<SearchBarResponse>> = new Map();
  readonly #searchBarAdapter: SearchBarAdapter = inject(SearchBarAdapter);
  readonly #searchBarOptionsService: SearchBarOptionsService = inject(SearchBarOptionsService);

  clearPlanList(): void {
    Array.from(this.#planListByPartner.values()).forEach(value => value.complete());
    Array.from(this.#planListByPartnerAndChannel.values()).forEach(value => value.complete());
    this.#planListByPartner = new Map();
    this.#planListByPartnerAndChannel = new Map();
  }

  closeOnMobileWhenAllMandatoryFilters(
    hasDataChange: boolean,
    isMobile: Signal<boolean>,
    closeIt: WritableSignal<{ timestamp: number }>,
  ): void {
    if (hasDataChange && isMobile()) {
      closeIt.set({ timestamp: Date.now() });
    }
  }

  getSearchBarOptions(partnerId: number, channelId?: string): Observable<SearchBarResponse> {
    return this.getSearchBarOptionsUpdated(partnerId, channelId).pipe(take(1));
  }

  getSearchBarOptionsUpdated(partnerId: number, channelId?: string, partnerType?: string): Observable<SearchBarResponse> {
    if (channelId !== undefined) {
      const key = this.#partnerAndChannelKey(partnerId, channelId);
      if (!this.#planListByPartnerAndChannel.has(key)) {
        this.addNewPartnerAndChannelToMap(key, partnerId, channelId, partnerType);
      }
      return this.#planListByPartnerAndChannel.get(key)?.asObservable() || of();
    }

    const partnerKey = this.#partnerKey(partnerId);
    if (!this.#planListByPartner.has(partnerKey)) {
      this.addNewPartnerToMap(partnerKey, partnerId, channelId, partnerType);
    }
    return this.#planListByPartner.get(partnerKey)?.asObservable() || of(new BaseResponse(null, null));
  }

  updatePartnerPlanOptionName(partnerId: number, planId: number, newName: string): void {
    const partnerKey = this.#partnerKey(partnerId);
    if (!this.#planListByPartner.has(partnerKey)) {
      return;
    }
    this.#planListByPartner
      .get(partnerKey)
      ?.pipe(
        take(1),
        filter(value => Boolean(value.data)),
        map(
          (currentOptions: SearchBarResponse) =>
            new BaseResponse(this.changePlanOption(currentOptions.data, planId, { name: newName }), null),
        ),
      )
      .subscribe(updated => this.#planListByPartner.get(partnerKey)?.next(updated));
  }

  updatePartnerPlanOptionStatus(partnerId: number, planId: number, newStatus: PlanStatus): void {
    const partnerKey = this.#partnerKey(partnerId);
    if (!this.#planListByPartner.has(partnerKey)) {
      return;
    }
    this.#planListByPartner
      .get(partnerKey)
      ?.pipe(
        take(1),
        filter(value => Boolean(value.data)),
        map(
          (currentOptions: SearchBarResponse) =>
            new BaseResponse(this.changePlanOption(currentOptions.data, planId, { status: newStatus }), null),
        ),
      )
      .subscribe(updated => this.#planListByPartner.get(partnerKey)?.next(updated));
  }

  updatePartnerPlanOptionsByPriorityPlans(prioritizedPlanIds: number[], partnerId: number, channelId?: string): void {
    if (!prioritizedPlanIds || prioritizedPlanIds.length === 0) {
      return;
    }

    if (channelId !== undefined) {
      const key = this.#partnerAndChannelKey(partnerId, channelId);
      if (!this.#planListByPartnerAndChannel.has(key)) {
        return;
      }
      this.#orderPlanOptionsByPrioritizedPlans(this.#planListByPartnerAndChannel.get(key)!, prioritizedPlanIds);
      return;
    }

    const partnerKey = this.#partnerKey(partnerId);
    if (!this.#planListByPartner.has(partnerKey)) {
      return;
    }

    this.#orderPlanOptionsByPrioritizedPlans(this.#planListByPartner.get(partnerKey)!, prioritizedPlanIds);
  }

  private changePlanOption(
    currentOptions: SearchBarOptions | null,
    planId: number,
    newOption: { name?: string; status?: PlanStatus },
  ): SearchBarOptions | null {
    if (currentOptions === null) {
      return null;
    }

    return {
      ...currentOptions,
      plans:
        currentOptions?.plans?.map((option: PlanOption) =>
          option.id === planId
            ? new PlanOption(
                option.id,
                newOption.name ?? option.name,
                newOption.status ?? option.status,
                option.kind,
                option.places,
                option.isAssetBased,
                option.nextSessionDate,
                option.lastSessionDate,
                option.nextSessionDateRegardlessOfAttendance,
                option.lastSessionDateRegardlessOfExpirationAndAttendance,
                option.hasSeatingProvider,
                option.reviewStatus,
                option.hasDeclarativeInventory,
              )
            : option,
        ) ?? [],
    };
  }

  private addNewPartnerToMap(key: string, partnerId: number, channelId?: string, partnerType?: string): void {
    const partnerSubject = new ReplaySubject<SearchBarResponse>(1);
    this.#planListByPartner.set(key, partnerSubject);
    this.updatePlanById(partnerSubject, key, partnerId, channelId, partnerType);
  }

  private addNewPartnerAndChannelToMap(key: string, partnerId: number, channelId: string, partnerType?: string): void {
    const partnerSubject = new ReplaySubject<SearchBarResponse>(1);
    this.#planListByPartnerAndChannel.set(key, partnerSubject);
    this.updatePlanById(partnerSubject, key, partnerId, channelId, partnerType);
  }

  private updatePlanById(
    planSubject: ReplaySubject<SearchBarResponse>,
    key: string,
    partnerId: number,
    channelId?: string,
    partnerType?: string,
  ): void {
    this.requestSearchBarOptions(partnerId, channelId, partnerType)
      .pipe(
        tap((value: BaseResponse<SearchBarOptions | null>) => {
          if (value === null) {
            planSubject.complete();
            if (channelId !== undefined) {
              this.#planListByPartnerAndChannel.delete(key);
              return;
            }
            this.#planListByPartner.delete(key);
          }
        }),
      )
      .subscribe((response: BaseResponse<SearchBarOptions | null>) => planSubject.next(response));
  }

  private requestSearchBarOptions(
    partnerId: number,
    channelId?: string,
    partnerType?: string,
  ): Observable<BaseResponse<SearchBarOptions | null>> {
    return this.#searchBarOptionsService.getOptions(partnerId, channelId, partnerType).pipe(
      map((result: BaseResponse<Plan[] | null>) => this.#searchBarAdapter.fromApi(result as BaseResponse<Plan[]>)),
      catchError(error => ErrorResponseUtils.getErrorResponse<SearchBarOptions>(error)),
    );
  }

  #distributorPartnerScope(): string {
    const targetOrganizationId = this.#distributorTarget.target()?.targetOrganizationId;

    return targetOrganizationId === undefined ? '' : `for-${targetOrganizationId}-`;
  }

  #orderPlanOptionsByPrioritizedPlans(searchBarResponse: ReplaySubject<SearchBarResponse>, prioritizedPlanIds: number[]): void {
    searchBarResponse
      .pipe(
        take(1),
        filter(value => Boolean(value.data?.plans)),
        tap((currentOptions: SearchBarResponse) => {
          let plansHaveBeenModified = false;
          prioritizedPlanIds.forEach((prioritizedPlanId, priorityIndex) => {
            const planIndex: number = currentOptions.data?.plans?.findIndex(plan => plan.id === prioritizedPlanId) ?? -1;
            if (planIndex !== -1) {
              plansHaveBeenModified = true;
              const plan: PlanOption | null = currentOptions.data?.plans?.splice(planIndex, 1)[0] ?? null;
              if (plan !== null) {
                currentOptions.data?.plans?.splice(priorityIndex, 0, plan);
              }
            }
          });
          if (plansHaveBeenModified) {
            searchBarResponse.next(currentOptions);
          }
        }),
      )
      .subscribe();
  }

  #partnerAndChannelKey(partnerId: number, channelId: string): string {
    return `${this.#distributorPartnerScope()}${partnerId}-${channelId}`;
  }

  #partnerKey(partnerId: number): string {
    return `${this.#distributorPartnerScope()}${partnerId}`;
  }
}
