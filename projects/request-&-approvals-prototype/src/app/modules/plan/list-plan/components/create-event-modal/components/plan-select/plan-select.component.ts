import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  input,
  OnDestroy,
  OnInit,
  output,
  Signal,
  signal,
  WritableSignal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { IgntTypeaheadModule } from '@fz-original/app/shared/layout/filters/ignt-typeahead/ignt-typeahead.module';
import { SelectOptionTypeaheadInput } from '@fz-original/app/shared/layout/filters/select/select-option-typeahead.enum';
import { SelectOption } from '@fz-original/app/shared/layout/filters/select/select.interface';
import { LinkPaginationResponse } from '@fz-original/app/shared/models/link-pagination-response';
import { PlanKind } from '@fz-original/app/shared/models/plan/plan-kind.enum';
import { Plan } from '@fz-original/app/shared/models/plan/plan.model';
import { PartnerService } from '@fz-original/app/shared/services/partner/partner.service';
import { GetPlansQuery } from '@fz-original/app/shared/services/plan/get-plans-query';
import { PlanService } from '@fz-original/app/shared/services/plan/plan.service';
import { TranslateModule } from '@ngx-translate/core';
import { EMPTY, merge, Subject } from 'rxjs';
import { catchError, debounceTime, exhaustMap, finalize, map, switchMap, tap } from 'rxjs/operators';

export interface PlanSelection {
  planId: number;
  planName: string;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IgntTypeaheadModule, TranslateModule],
  selector: 'app-plan-select',
  standalone: true,
  styleUrl: './plan-select.component.scss',
  templateUrl: './plan-select.component.html',
})
export class PlanSelectComponent implements OnDestroy, OnInit {
  static readonly loadingOptionId = -999;

  readonly #destroyRef = inject(DestroyRef);
  readonly #partnerService = inject(PartnerService);
  readonly #planService = inject(PlanService);

  #cleanTrigger$ = new Subject<void>();
  #loadMore$ = new Subject<void>();
  #nextPageParam = '';
  #planNamesById = new Map<number, string>();
  #planOptions: WritableSignal<SelectOption[]> = signal([]);
  #refreshTimeoutId: ReturnType<typeof setTimeout> | null = null;
  #refreshTrigger$ = new Subject<void>();
  #typeAheadInteraction$ = new Subject<string>();

  fieldLabelKey = input('createEvent.catalogPlanFieldLabel');
  helperKey = input('createEvent.catalogPlanHelper');
  labelKey = input('createEvent.catalogPlan');
  planIdChange = output<number | null>();
  planKind = input<PlanKind | undefined>(undefined);
  selectedPlanChange = output<PlanSelection | null>();
  cleanTrigger$ = this.#cleanTrigger$.asObservable();
  hasMorePlans: WritableSignal<boolean> = signal(false);
  isLoading: WritableSignal<boolean> = signal(false);
  isLoadingMore: WritableSignal<boolean> = signal(false);
  planOptions: Signal<SelectOption[]> = computed(() => {
    const options = this.#planOptions();

    if (this.isLoadingMore() && this.hasMorePlans()) {
      return [
        ...options,
        {
          id: PlanSelectComponent.loadingOptionId,
          isLoadingOption: true,
          title: '',
        },
      ];
    }

    return options;
  });
  refreshTrigger$ = this.#refreshTrigger$.asObservable();
  searchTerm: WritableSignal<string> = signal('');
  selectedPlanOption: WritableSignal<SelectOption | undefined> = signal(undefined);
  selectOptionTypeaheadInput = SelectOptionTypeaheadInput;

  constructor() {
    this.#typeAheadInteraction$
      .pipe(
        debounceTime(100),
        tap(term => {
          this.searchTerm.set(term);
          this.#resetPagination();
          this.#planOptions.set([]);
          this.#clearRefreshTimeout();
          this.isLoading.set(true);
        }),
        switchMap(() => {
          const partner = this.#partnerService.getPartner();

          if (!partner?.id) {
            this.isLoading.set(false);
            return EMPTY;
          }

          return merge(
            this.#planService.getPlansWithAnalytics(this.#buildPlansQuery(partner.id)).pipe(
              map(result => ({ isLoadMore: false as const, result })),
              catchError(() => EMPTY),
              finalize(() => this.isLoading.set(false)),
            ),
            this.#loadMore$.pipe(
              exhaustMap(() => {
                if (!this.#nextPageParam) {
                  return EMPTY;
                }

                this.isLoadingMore.set(true);

                return this.#planService.getPlansWithAnalytics(this.#buildPlansQuery(partner.id), this.#nextPageParam).pipe(
                  map(result => ({ isLoadMore: true as const, result })),
                  catchError(() => EMPTY),
                  finalize(() => this.isLoadingMore.set(false)),
                );
              }),
            ),
          );
        }),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe(({ isLoadMore, result }) => {
        if (isLoadMore) {
          this.#appendPlanOptions(result.data ?? []);
          this.#applyPaginationResult(result);
          this.#scheduleRefresh(0);
        } else {
          this.#replacePlanOptions(result.data ?? []);
          this.#applyPaginationResult(result);
          this.#syncSelectedPlanOption();
          this.#scheduleRefresh(10);
        }
      });
  }

  ngOnInit(): void {
    this.onPlanSearch('');
  }

  ngOnDestroy(): void {
    this.#clearRefreshTimeout();
    this.#cleanTrigger$.complete();
    this.#loadMore$.complete();
    this.#refreshTrigger$.complete();
    this.#typeAheadInteraction$.complete();
  }

  onPlanScrollToEnd(): void {
    if (!this.hasMorePlans() || this.isLoading() || this.isLoadingMore()) {
      return;
    }

    this.#loadMore$.next();
  }

  onPlanSearch(term: string): void {
    this.#typeAheadInteraction$.next(term.trim());
  }

  onPlanTypeaheadSelected(option: SelectOption | undefined): void {
    if (!option || option.id === PlanSelectComponent.loadingOptionId) {
      this.selectedPlanOption.set(undefined);
      this.planIdChange.emit(null);
      this.selectedPlanChange.emit(null);
      return;
    }

    const numericValue = typeof option.id === 'string' ? Number(option.id) : option.id;
    const planId = Number.isNaN(numericValue) ? null : numericValue;

    this.selectedPlanOption.set(option);
    this.planIdChange.emit(planId);

    if (planId === null) {
      this.selectedPlanChange.emit(null);
      return;
    }

    this.selectedPlanChange.emit({
      planId,
      planName: this.#planNamesById.get(planId) ?? String(planId),
    });
  }

  reset(): void {
    this.selectedPlanOption.set(undefined);
    this.#cleanTrigger$.next();
    this.planIdChange.emit(null);
    this.selectedPlanChange.emit(null);
    this.#typeAheadInteraction$.next('');
  }

  #appendPlanOptions(plans: Plan[]): void {
    this.#cachePlanNames(plans);
    const newOptions = this.#mapPlansToOptions(plans);
    const currentOptions = this.#planOptions();
    const existingIds = new Set(currentOptions.map(option => option.id));
    const uniqueNewOptions = newOptions.filter(option => !existingIds.has(option.id));

    this.#planOptions.set([...currentOptions, ...uniqueNewOptions]);
  }

  #applyPaginationResult(result: LinkPaginationResponse<Plan[] | null>): void {
    this.#nextPageParam = result.getNextPaginationQueryString() ?? '';
    this.hasMorePlans.set(Boolean(this.#nextPageParam));
  }

  #buildPlansQuery(partnerId: number): GetPlansQuery {
    const planKind = this.#resolvePlanKindFilter();

    return {
      ...(planKind ? { kind: planKind } : {}),
      name: this.searchTerm() || undefined,
      partnerId,
    };
  }

  #clearRefreshTimeout(): void {
    if (this.#refreshTimeoutId !== null) {
      clearTimeout(this.#refreshTimeoutId);
      this.#refreshTimeoutId = null;
    }
  }

  #replacePlanOptions(plans: Plan[]): void {
    this.#cachePlanNames(plans);
    this.#planOptions.set(this.#mapPlansToOptions(plans));
  }

  #cachePlanNames(plans: Plan[]): void {
    plans.forEach(plan => {
      if (plan.id !== undefined) {
        this.#planNamesById.set(plan.id, plan.name?.trim() || String(plan.id));
      }
    });
  }

  #mapPlansToOptions(plans: Plan[]): SelectOption[] {
    const planKind = this.#resolvePlanKindFilter();
    const seen = new Set<number>();

    return plans
      .filter((plan): plan is Plan & { id: number } => {
        if (plan.id === undefined || (planKind && plan.kind !== planKind)) {
          return false;
        }

        if (seen.has(plan.id)) {
          return false;
        }

        seen.add(plan.id);
        return true;
      })
      .map(plan => ({
        id: plan.id,
        title: this.#formatPlanOptionTitle(plan.id, plan.name),
      }));
  }

  #formatPlanOptionTitle(planId: number, planName: string | undefined): string {
    const name = planName?.trim() || String(planId);
    return `(${planId}) ${name}`;
  }

  #resetPagination(): void {
    this.#nextPageParam = '';
    this.hasMorePlans.set(false);
    this.isLoadingMore.set(false);
  }

  #resolvePlanKindFilter(): PlanKind | undefined {
    const planKind = this.planKind();

    if (!planKind || planKind === PlanKind.ALL) {
      return undefined;
    }

    return planKind;
  }

  #scheduleRefresh(delayMs: number): void {
    this.#clearRefreshTimeout();
    this.#refreshTimeoutId = setTimeout(() => {
      this.#refreshTrigger$.next();
      this.#refreshTimeoutId = null;
    }, delayMs);
  }

  #syncSelectedPlanOption(): void {
    const selectedOption = this.selectedPlanOption();

    if (!selectedOption?.id) {
      return;
    }

    const matchingOption = this.planOptions().find(option => option.id === selectedOption.id);

    if (matchingOption) {
      this.selectedPlanOption.set(matchingOption);
    }
  }
}
