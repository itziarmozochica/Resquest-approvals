import { computed, DestroyRef, inject, Injectable, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';

import { SelectOption } from '@fz-original/app/shared/layout/filters/select/select.interface';
import { EMPTY, of } from 'rxjs';
import { catchError, filter, finalize, map, switchMap } from 'rxjs/operators';

import { BaseResponse } from '../../../../shared/models/base-response';
import { PlanOption } from '../../../../shared/search-bar/models/plan-option.model';
import { SearchBarService } from '../../../../shared/search-bar/service/search-bar.service';
import { ChannelsService } from '../../../../shared/services/channel/channels.service';
import { Channel } from '../../../../shared/services/session-availability/channel.enum';
import { OnsiteSetupSalesChannelContext } from '../components/onsite-setup-form/onsite-setup-form.model';

@Injectable()
export class OnsiteSetupSalesChannelService {
  readonly #channelsService = inject(ChannelsService);
  readonly #destroyRef = inject(DestroyRef);
  readonly #searchBarService = inject(SearchBarService);

  readonly partnerChannelOptions = signal<SelectOption[]>([]);
  readonly plans = signal<PlanOption[]>([]);
  readonly loadedChannelId = signal<string | null>(null);
  readonly isLoadingPlans = signal(false);

  readonly context = computed<OnsiteSetupSalesChannelContext>(() => ({
    partnerSalesChannelOptions: this.partnerChannelOptions(),
    loadedPlansSalesChannelId: this.loadedChannelId(),
    plansLoadingForSalesChannel: this.isLoadingPlans(),
  }));

  #partnerId: number | null = null;
  #plansLoadRequest = signal<{ channelId: string } | null>(null);

  constructor() {
    this.#setupPlansLoading();
  }

  setPartnerId(partnerId: number | null): void {
    this.#partnerId = partnerId;
  }

  loadPartnerChannels(partnerId: number): void {
    this.partnerChannelOptions.set([]);
    const partnerIdForRequest = partnerId;

    this.#channelsService
      .getBoxOfficeChannelOptions$(partnerIdForRequest)
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe(options => {
        if (this.#partnerId !== partnerIdForRequest) {
          return;
        }
        this.partnerChannelOptions.set(options);
      });
  }

  loadPlansForChannel(channelId: string): void {
    if (this.#partnerId == null) {
      return;
    }

    this.#plansLoadRequest.set({ channelId });
  }

  setPlans(plans: PlanOption[]): void {
    this.plans.set(plans);
    this.loadedChannelId.set(Channel.BoxOffice);
  }

  reset(): void {
    this.partnerChannelOptions.set([]);
    this.plans.set([]);
    this.loadedChannelId.set(null);
    this.isLoadingPlans.set(false);
    this.#partnerId = null;
    this.#plansLoadRequest.set(null);
  }

  #setupPlansLoading(): void {
    toObservable(this.#plansLoadRequest)
      .pipe(
        filter((request): request is { channelId: string } => request != null),
        switchMap(({ channelId }) => {
          if (this.#partnerId == null) {
            return EMPTY;
          }

          this.isLoadingPlans.set(true);

          return this.#searchBarService.getSearchBarOptions(this.#partnerId, channelId).pipe(
            catchError(() => of(new BaseResponse({ cities: [], plans: [], places: [] }, null))),
            map(plans => ({ channelId, plans })),
            finalize(() => {
              this.isLoadingPlans.set(false);
            }),
          );
        }),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe(({ channelId, plans }) => {
        this.plans.set(plans.data?.plans || []);
        this.loadedChannelId.set(channelId);
      });
  }
}
