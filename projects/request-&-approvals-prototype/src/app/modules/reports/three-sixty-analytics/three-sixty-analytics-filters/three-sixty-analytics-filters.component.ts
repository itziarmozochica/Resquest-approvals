import {
  AfterViewInit,
  Component,
  effect,
  EventEmitter,
  inject,
  input,
  OnDestroy,
  OnInit,
  Output,
  TemplateRef,
  ViewChild,
} from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Params, Router } from '@angular/router';

import { MultiSelectExclusiveGroupDirective } from '@fz-original/app/shared/layout/filters/multi-select/multi-select-exclusive-group.directive';
import { MultiSelectModule } from '@fz-original/app/shared/layout/filters/multi-select/multi-select.module';
import { Partner } from '@fz-original/app/shared/models/partner/partner.model';
import { SearchBarOptions } from '@fz-original/app/shared/search-bar/models/search-bar.options';
import { IgntIconComponent } from '@ignite/icon';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { combineLatest, EMPTY, merge, Observable, of, Subject } from 'rxjs';
import { distinctUntilChanged, filter, map, mergeMap, skip, takeUntil, tap } from 'rxjs/operators';

import { SelectOption } from '../../../../shared/layout/filters/select/select.interface';
import { PlanKind } from '../../../../shared/models/plan/plan-kind.enum';
import { PlanStatus } from '../../../../shared/models/plan/plan-status.enum';
import { CityOption } from '../../../../shared/search-bar/models/city-option.model';
import { MultiSelectPlanOption } from '../../../../shared/search-bar/models/multi-select-plan-option.model';
import { PlaceOption } from '../../../../shared/search-bar/models/place-option.model';
import { PlanOption } from '../../../../shared/search-bar/models/plan-option.model';
import { SearchBarService } from '../../../../shared/search-bar/service/search-bar.service';
import { PartnerService } from '../../../../shared/services/partner/partner.service';
import { capToSinglePlan } from '../utils/single-plan-selection.util';
import { areThreeSixtyQueryParamsEqual, toThreeSixtyQueryParams } from '../utils/three-sixty-query-params.util';
import { SelectPlaceOption, ThreeSixtyQueryParams, ThreeSixtySelection } from './three-sixty-analytics-filters.model';

type SelectStatusOption = SelectOption;

@Component({
  imports: [TranslateModule, MultiSelectModule, MultiSelectExclusiveGroupDirective, IgntIconComponent],
  selector: 'app-three-sixty-analytics-filters',
  standalone: true,
  styleUrls: ['./three-sixty-analytics-filters.component.scss'],
  templateUrl: './three-sixty-analytics-filters.component.html',
})
export class ThreeSixtyAnalyticsFiltersComponent implements OnInit, OnDestroy, AfterViewInit {
  static readonly eurCurrency: SelectOption = { id: 'EUR', title: 'EUR' };
  static readonly gbpCurrency: SelectOption = { id: 'GBP', title: 'GBP' };
  static readonly threeSixtyReportsLastSelectionKey = 'three_sixty_reports_last_selection';
  static readonly usdCurrency: SelectOption = { id: 'USD', title: 'USD' };

  #allCityOptions: Array<CityOption> = [];
  #allPlaceOptions: Array<SelectPlaceOption> = [];

  #allPlans: Array<PlanOption> = [];
  #allStatuses: Array<PlanStatus> = [PlanStatus.DRAFT, PlanStatus.OFF_SALE, PlanStatus.ON_SALE];

  #defaultCurrency: SelectOption = ThreeSixtyAnalyticsFiltersComponent.usdCurrency;
  #defaultCurrencyOptions: Array<SelectOption> = [
    ThreeSixtyAnalyticsFiltersComponent.usdCurrency,
    ThreeSixtyAnalyticsFiltersComponent.eurCurrency,
    ThreeSixtyAnalyticsFiltersComponent.gbpCurrency,
  ];

  #destroy$ = new Subject<void>();
  #expectedQueryParams: Params | null = null;
  /** Last selection read from the query params, so a mode change can re-run the funnel with it. */
  #lastQuery: ThreeSixtySelection | null = null;
  #partnerService: PartnerService = inject(PartnerService);
  /**
   * The plan ids that reach the URL and `localStorage`. In single-plan mode they are **not** the
   * rendered ones: only what is painted collapses, so leaving the tab or reloading restores the
   * user's multi-plan selection (PRD-4516 §3.3.2).
   */
  #persistedPlanIds: Array<number> = [];
  /** The currency the user actually chose, kept out of the render while the picker is pinned. */
  #persistedCurrency?: string;
  /**
   * Fired when a pick changes only what is **rendered**. In single-plan mode the URL deliberately keeps
   * the persisted plan ids, so such a pick leaves it byte-identical and the router drops the navigation
   * (`onSameUrlNavigation` defaults to `'ignore'`) — without this, nothing would reach the host.
   */
  readonly #renderedSelectionChanged$ = new Subject<void>();
  #route: ActivatedRoute = inject(ActivatedRoute);
  #router: Router = inject(Router);
  #searchBarService: SearchBarService = inject(SearchBarService);
  #selectionModeChanged$: Observable<ThreeSixtySelection>;
  #translateService: TranslateService = inject(TranslateService);
  cityOptions: Array<CityOption> = [];

  currencyOptions: Array<SelectOption> = [];
  @Output() filtersSelected = new EventEmitter<ThreeSixtySelection>();

  placeOptions: Array<SelectPlaceOption> = [];

  planOptions: Array<MultiSelectPlanOption> = [];
  previousThreeSixtySelection?: ThreeSixtySelection;
  @ViewChild('selectCurrencyTemplate', { static: true }) selectCurrencyTemplate!: TemplateRef<unknown>;
  @Output() selectCurrencyTemplateInitialised = new EventEmitter<TemplateRef<unknown> | null>();
  selectedCityOptions: Array<CityOption> = [];
  selectedCurrencyOption?: SelectOption;

  selectedPlaceOptions: Array<SelectPlaceOption> = [];
  selectedPlanOptions: Array<MultiSelectPlanOption> = [];
  selectedStatusOptions: Array<SelectStatusOption> = [];
  showCurrencyOptionSelector = false;
  /**
   * Set by the host while a tab that can only honour a single plan is active (PRD-4516 §3.3).
   *
   * It does more than cap the selection: it also makes the **place** authoritative over the plan, the
   * way `reports/real-time` already works. Capping alone is not enough here, because 360 injects a
   * place's plans back into the selection (`#addPlansAndPlacesRelatedSelections`) and prunes places
   * that host no selected plan — so the place the user just picked would de-select itself.
   */
  readonly singlePlanSelection = input<boolean>(false);
  /**
   * Set by the host while a tab whose cards never read the currency parameter is active: the picker
   * is pinned to the selected event's own currency, because any other value would relabel the same
   * figures without changing them.
   *
   * Only ever set together with `singlePlanSelection`, which is what makes "the event's currency"
   * a single well-defined value rather than one of several.
   */
  readonly currencyLockedToLocal = input<boolean>(false);
  statusOptions: Array<SelectStatusOption> = [];

  constructor() {
    /**
     * Only `queryParams` moves the funnel, so switching the mode off would leave the bar collapsed
     * while the URL still holds every plan. Re-running `#initializeSelection` with the last query is
     * what restores them; `distinctUntilChanged` in `#init` stops it from looping.
     */
    effect(() => this.#closeCurrencySelectorWhilePinned());
    this.#selectionModeChanged$ = combineLatest([toObservable(this.singlePlanSelection), toObservable(this.currencyLockedToLocal)]).pipe(
      distinctUntilChanged(([singlePlan, lockedCurrency], [nextSinglePlan, nextLockedCurrency]) => {
        return singlePlan === nextSinglePlan && lockedCurrency === nextLockedCurrency;
      }),
      skip(1),
      filter((): boolean => this.#lastQuery !== null),
      map((): ThreeSixtySelection => {
        const lastQuery: ThreeSixtySelection = this.#lastQuery as ThreeSixtySelection;

        /**
         * Restoring the url's plans is what the widening is for, but this stream also fires while the
         * narrowing stays on and only the pin changes — between two single-plan tabs that differ in
         * whether their cards read the currency. The url still names every plan there by design
         * (`#persistedPlanIds`), so replaying it would snap the control back to the first one and
         * silently swap the event under a partner who picked another inside the tab.
         */
        return this.singlePlanSelection() ? { ...lastQuery, planIds: this.selectedPlanOptions.map(({ id }) => id) } : lastQuery;
      }),
    );
  }

  ngAfterViewInit(): void {
    this.selectCurrencyTemplateInitialised.next(this.selectCurrencyTemplate);
  }

  ngOnDestroy(): void {
    this.selectCurrencyTemplateInitialised.next(null);
    this.#destroy$.next();
  }

  ngOnInit(): void {
    this.#init();
  }

  selectCityOptions(options: Array<CityOption>): void {
    this.selectedCityOptions = options;
    this.#updateCurrencyOptions();
    this.#updateQueryParamsFromPick();
  }

  selectCurrency(currency: SelectOption): void {
    this.selectedCurrencyOption = currency;
    this.showCurrencyOptionSelector = false;
    this.#updateQueryParamsFromPick();
  }

  selectPlaceOptions(options: Array<SelectPlaceOption>): void {
    this.selectedPlaceOptions = options;
    this.#updateQueryParamsFromPick();
  }

  selectPlanOptions(options: Array<MultiSelectPlanOption>): void {
    this.selectedPlanOptions = this.singlePlanSelection() ? options.slice(0, 1) : options;
    this.#updateQueryParamsFromPick();

    /**
     * Plans are the one selection single-plan mode keeps out of the URL, so this is the one pick whose
     * change cannot travel through the query params. The persisted ids stay as they are: the plan picked
     * inside the tab is a view, and leaving the tab restores what the user had.
     */
    if (this.singlePlanSelection()) {
      this.#renderedSelectionChanged$.next();
    }
  }

  selectStatusOptions(options: Array<SelectStatusOption>): void {
    this.selectedStatusOptions = options;
    this.#updateQueryParamsFromPick();
  }

  toggleCurrencySelector(): void {
    if (this.currencyLockedToLocal()) {
      return;
    }
    this.showCurrencyOptionSelector = !this.showCurrencyOptionSelector;
  }

  /**
   * The pin hides the options, it does not close them: without this the flag survives the pinned tab
   * and the menu reappears on the way out, open, though the partner never reopened it.
   */
  #closeCurrencySelectorWhilePinned(): void {
    if (this.currencyLockedToLocal()) {
      this.showCurrencyOptionSelector = false;
    }
  }

  #addPlansAndPlacesRelatedSelections(planIds: number[], placeIds: number[]): { placeIds: number[]; planIds: number[] } {
    const previousPlacesSelected = this.previousThreeSixtySelection?.placeIds || [];
    const previousPlansSelected = this.previousThreeSixtySelection?.planIds || [];

    const addedPlacesIds = placeIds.filter(id => !previousPlacesSelected.includes(id));
    const addedPlansIds = planIds.filter(id => !previousPlansSelected.includes(id));

    const addedPlans = this.#allPlans.filter(plan => addedPlansIds.includes(plan.id));
    const addedPlaces = this.#allPlaceOptions.filter(place => addedPlacesIds.includes(place.id));

    const addedPlacesIdsFromAddedPlans = this.#getPlansPlaces(addedPlans).map(({ id }) => id);
    const addedPlansIdsFromAddedPlaces = this.#getPlacesPlans(addedPlaces, this.#allPlans).map(({ id }) => id);

    return {
      // Neither direction injects in single-plan mode. A plan looks *added* on every pass here, because the
      // URL keeps `#persistedPlanIds` while `previousThreeSixtySelection` holds the capped one — injecting
      // would put the places of the plans that are not rendered back into the selection, and since places
      // are no longer pruned below they would stay, outliving the tab in the URL and in `localStorage`.
      placeIds: this.singlePlanSelection() ? placeIds : Array.from(new Set([...placeIds, ...addedPlacesIdsFromAddedPlans])),
      // In single-plan mode the place does not inject its plans, so picking a place narrows the plan
      // list instead of refilling it — the semantics `reports/real-time` already has.
      planIds: this.singlePlanSelection() ? planIds : Array.from(new Set([...planIds, ...addedPlansIdsFromAddedPlaces])),
    };
  }

  #capPlanIds(planIds: Array<number>): Array<number> {
    return this.singlePlanSelection() ? capToSinglePlan(planIds) : planIds;
  }

  #areArrayEqual<T>(arrayA: T[], arrayB: T[]): boolean {
    return arrayA.length === arrayB.length && arrayA.every(item => arrayB.includes(item));
  }

  #areSelectionsEqual(selectionA: ThreeSixtySelection, selectionB: ThreeSixtySelection): boolean {
    return (
      this.#areArrayEqual(selectionA.cityIds, selectionB.cityIds) &&
      this.#areArrayEqual(selectionA.planIds, selectionB.planIds) &&
      this.#areArrayEqual(selectionA.placeIds, selectionB.placeIds) &&
      this.#areArrayEqual(selectionA.statuses, selectionB.statuses) &&
      selectionA.currency === selectionB.currency
    );
  }

  #filterAvailableOptionsBySelection(threeSixtySelection: ThreeSixtySelection): {
    cityOptions: CityOption[];
    placeOptions: SelectPlaceOption[];
    planOptions: MultiSelectPlanOption[];
  } {
    const { cityIds, statuses } = threeSixtySelection;
    const plansFilteredByStatus = this.#getPlansFilteredByStatus(this.#allPlans, statuses);
    const placesFilteredByStatus = this.#getPlansPlaces(plansFilteredByStatus);
    const citiesFilteredByStatus = this.#getPlacesCities(placesFilteredByStatus, this.#allCityOptions);

    const plansFilteredByStatusAndCities = this.#getPlansFilteredByCities(plansFilteredByStatus, cityIds);
    const placesFilteredByStatusAndCities = this.#getPlacesFilteredByCities(placesFilteredByStatus, cityIds);

    return {
      cityOptions: citiesFilteredByStatus,
      placeOptions: this.#parsePlaceOptions(placesFilteredByStatusAndCities),
      planOptions: this.#parsePlanOptions(plansFilteredByStatusAndCities),
    };
  }

  #getCurrencyOptions(): Array<SelectOption> {
    // A city can carry `''` or `null` as its currency, and an option built from one renders as a
    // blank entry that writes an empty `currency` to the url and to the embed parameters when picked.
    const selectedCityCurrencies: Array<string> = this.selectedCityOptions
      .map(city => city.currency)
      .filter((currency): currency is string => Boolean(currency));

    if (this.currencyLockedToLocal()) {
      // `selectedCityCurrencies` is already free of `''` and `null`, so a city carrying one falls
      // through to the default rather than pinning the button to a blank option.
      const localCurrency: string = selectedCityCurrencies[0] ?? this.#defaultCurrency.id;
      return [{ id: localCurrency, title: localCurrency }];
    }

    return [...new Set([...selectedCityCurrencies, ...this.#defaultCurrencyOptions.map(option => option.id)])]
      .map(currency => ({ id: currency, title: currency }))
      .sort((a, b) => {
        if (a.id === this.selectedCurrencyOption?.id) {
          return -1;
        }
        if (b.id === this.selectedCurrencyOption?.id) {
          return 1;
        }
        if (a.id === this.selectedCityOptions[0]?.currency) {
          return -1;
        }
        if (b.id === this.selectedCityOptions[0]?.currency) {
          return 1;
        }
        return 0;
      });
  }

  #getCurrentSelection(): ThreeSixtySelection {
    return {
      cityIds: this.selectedCityOptions.map(({ id }) => id),
      currency: this.selectedCurrencyOption?.id ?? null,
      placeIds: this.selectedPlaceOptions.map(({ id }) => id),
      planIds: this.selectedPlanOptions.map(({ id }) => id),
      statuses: this.selectedStatusOptions.map(({ id }) => id),
    };
  }

  #getInitiallySelectedOptions<T extends SelectOption, U extends number | PlanStatus | string>(
    existingOptions: Array<T>,
    ids: Array<U>,
  ): Array<T> {
    return existingOptions.length === 1 ? [existingOptions[0]] : existingOptions.filter(option => ids.includes(option.id));
  }

  #getInitialSelectionFromLocalStorage(): ThreeSixtySelection | null {
    const previousSelectionString = localStorage.getItem(ThreeSixtyAnalyticsFiltersComponent.threeSixtyReportsLastSelectionKey);
    try {
      return previousSelectionString ? (JSON.parse(previousSelectionString) as ThreeSixtySelection) : null;
    } catch {
      return null;
    }
  }

  #getPlacesCities(places: PlaceOption[], allCities: CityOption[]): CityOption[] {
    const placesCitiesIds = places.map(place => place.cityId);
    const placesCitiesIdsUnique = Array.from(new Set(placesCitiesIds).values());

    return allCities.filter(({ id }) => placesCitiesIdsUnique.includes(id));
  }

  #getPlacesFilteredByCities(places: PlaceOption[], cityIds: number[]): PlaceOption[] {
    return places.filter(place => cityIds.includes(place.cityId));
  }

  #getPlacesPlans(places: SelectPlaceOption[], plans: PlanOption[]): PlanOption[] {
    const placesIds = places.map(place => place.id);
    return plans.filter(plan => plan.places.some(place => placesIds.includes(place.id)));
  }

  #getPlansFilteredByCities(plans: PlanOption[], cityIds: number[]): PlanOption[] {
    return plans.filter(plan => plan.places.some(place => cityIds.includes(place.cityId)));
  }

  #getPlansFilteredByStatus(plans: PlanOption[], statuses: PlanStatus[]): PlanOption[] {
    return plans.filter(plan => statuses.some(status => plan.status === status));
  }

  #getPlansPlaces(plans: PlanOption[]): PlaceOption[] {
    return this.#getUniqueByKey(
      plans.flatMap(plan => plan.places),
      'id',
    );
  }

  #getSearchParams(): Observable<ThreeSixtySelection> {
    return this.#route.queryParams.pipe(
      mergeMap((params, index) => {
        this.#expectedQueryParams = params;
        const query = this.#parseQueryParams(params);
        const storedQuery: ThreeSixtySelection | null = this.#getInitialSelectionFromLocalStorage();

        if (
          index === 0 &&
          (query.cityIds.length === 0 || query.planIds.length === 0) &&
          storedQuery &&
          storedQuery.cityIds.length > 0 &&
          storedQuery.planIds.length > 0 &&
          storedQuery.currency !== null
        ) {
          this.#updateQueryParams({
            cityIds: storedQuery.cityIds,
            currency: storedQuery.currency,
            placeIds: storedQuery.placeIds ?? [],
            planIds: storedQuery.planIds,
            statuses: storedQuery.statuses,
          });
          return EMPTY;
        }

        this.#lastQuery = query;

        return of(query);
      }),
    );
  }

  #getUniqueByKey<T>(items: T[], key: keyof T): T[] {
    const uniqueItems: T[] = [];
    const ids = new Set<T[typeof key]>();

    for (const item of items) {
      if (!ids.has(item[key])) {
        ids.add(item[key]);
        uniqueItems.push(item);
      }
    }

    return uniqueItems;
  }

  #init(): void {
    const partner: Partner | null = this.#partnerService.getPartner();
    this.#searchBarService
      .getSearchBarOptions(partner!.id)
      .pipe(
        tap(response => {
          // Showcase plans inherit their sessions from a parent catalog plan and don't own their own sales, so they
          // render empty 360 dashboards — exclude them from the picker. Cities/places shown are derived from #allPlans
          // (#filterAvailableOptionsBySelection), so filtering here keeps every dropdown consistent.
          this.#allPlans = (response.data as SearchBarOptions).plans.filter(plan => plan.kind !== PlanKind.SHOWCASE);
          this.#allCityOptions = Object.assign([], (response.data as SearchBarOptions).cities);
          this.#allPlaceOptions = this.#parsePlaceOptions((response.data as SearchBarOptions).places);
        }),
        mergeMap(() => this.#selectionChanges$()),
        map(() => this.#getCurrentSelection()),
        distinctUntilChanged((a, b) => this.#areSelectionsEqual(a, b)),
        takeUntil(this.#destroy$),
      )
      .subscribe(selection => {
        this.filtersSelected.emit(selection);
      });
  }

  /**
   * Everything that moves the selection, split by whether it has to be re-derived from the query params.
   *
   * The URL and a mode change do: both replay a query and rebuild every dropdown from it. A pick that only
   * changes what is rendered must **not**, because single-plan mode keeps the persisted plan ids in the URL
   * — re-deriving would snap the control back to the plan the URL still names.
   */
  #selectionChanges$(): Observable<unknown> {
    return merge(
      merge(this.#getSearchParams(), this.#selectionModeChanged$).pipe(tap(query => this.#initializeSelection(query))),
      this.#renderedSelectionChanged$,
    );
  }

  #initializeSelection(threeSixtySelection: ThreeSixtySelection): void {
    let updatedThreeSixtySelection = this.#syncSelection({
      ...threeSixtySelection,
      statuses: threeSixtySelection.statuses.length === 0 ? [PlanStatus.ON_SALE] : threeSixtySelection.statuses,
    });

    const { cityOptions, placeOptions, planOptions } = this.#filterAvailableOptionsBySelection(updatedThreeSixtySelection);

    updatedThreeSixtySelection = this.#updateSelectionWithSelectedOptions(
      updatedThreeSixtySelection,
      cityOptions,
      placeOptions,
      planOptions,
    );

    const { cityIds, currency, placeIds, planIds, statuses } = updatedThreeSixtySelection;

    this.#persistedPlanIds = this.singlePlanSelection() && threeSixtySelection.planIds.length > 0 ? threeSixtySelection.planIds : planIds;
    this.#persistedCurrency =
      this.currencyLockedToLocal() && threeSixtySelection.currency !== undefined ? threeSixtySelection.currency : currency;

    this.statusOptions = this.#allStatuses.map(status => this.#statusToSelectStatusOption(status));
    this.selectedStatusOptions = this.#getInitiallySelectedOptions(this.statusOptions, statuses);

    this.cityOptions = cityOptions;
    this.selectedCityOptions = this.#getInitiallySelectedOptions(this.cityOptions, cityIds);

    this.placeOptions = placeOptions;
    this.selectedPlaceOptions = this.#getInitiallySelectedOptions(this.placeOptions, placeIds);

    this.planOptions = planOptions;
    this.selectedPlanOptions = this.#getInitiallySelectedOptions(this.planOptions, planIds);

    this.currencyOptions = this.#getCurrencyOptions();
    const [selectedCurrencyOption] = this.#getInitiallySelectedOptions(this.currencyOptions, [currency ?? '']);
    this.selectedCurrencyOption = selectedCurrencyOption ?? (currency !== undefined ? { id: currency, title: currency } : undefined);

    this.#saveSelectionInLocalStorage(this.#withPersistedSelection(this.#getCurrentSelection()));
    this.#updateQueryParamsFromCurrentSelection();
    this.previousThreeSixtySelection = updatedThreeSixtySelection;
  }

  #navigate(queryParams: ThreeSixtyQueryParams): Promise<boolean> {
    return this.#router.navigate([], { queryParams, queryParamsHandling: 'merge', relativeTo: this.#route });
  }

  #parseCurrency(value: string): string {
    return value;
  }

  #parseNumericArrayQueryParam(value: string): Array<number> {
    if (!value) return [];
    return value?.split(',').map(item => parseInt(item, 10));
  }

  #parsePlaceOptions(placeOptions: Array<PlaceOption>): Array<SelectPlaceOption> {
    return placeOptions.reduce((options, { cityId, cityName, id, name: title }) => {
      if (!options.find(option => option.id === id)) {
        options.push({ cityId, description: cityName, id, title });
      }
      return options;
    }, [] as Array<SelectPlaceOption>);
  }

  #parsePlanOptions(planOptions: PlanOption[]): MultiSelectPlanOption[] {
    return planOptions.map(option => this.#planOptionToMultiselectPlanOption(option));
  }

  #parsePlanStatusArrayQueryParam(value: string): Array<PlanStatus> {
    if (!value) return [];
    return value?.split(',').map(item => item as PlanStatus);
  }

  #parseQueryParams({ cityIds, currency, placeIds, planIds, statuses }: Params): ThreeSixtySelection {
    return {
      cityIds: this.#parseNumericArrayQueryParam(cityIds),
      currency: this.#parseCurrency(currency),
      placeIds: this.#parseNumericArrayQueryParam(placeIds),
      planIds: this.#parseNumericArrayQueryParam(planIds),
      statuses: this.#parsePlanStatusArrayQueryParam(statuses),
    };
  }

  #planOptionToMultiselectPlanOption(plan: PlanOption): MultiSelectPlanOption {
    const { places } = plan;

    const place =
      places.find(place => this.selectedPlaceOptions.some(({ id }) => place.id === id)) ||
      places.find(place => this.selectedCityOptions.some(({ id }) => place.cityId === id)) ||
      places.find(place => this.cityOptions.some(({ id }) => place.cityId === id));

    return {
      cityId: place?.cityId as number,
      id: plan.id,
      placeName: `${place?.name} - ${place?.cityName}`,
      status: plan.status,
      title: plan.name,
    };
  }

  #releaseExpectation(requested: ThreeSixtyQueryParams): void {
    if (this.#expectedQueryParams === requested) {
      this.#expectedQueryParams = null;
    }
  }

  #removePlansAndPlacesInvalidSelections(planIds: number[], placeIds: number[]): { placeIds: number[]; planIds: number[] } {
    const places = this.#allPlaceOptions.filter(place => placeIds.includes(place.id));
    const plans = this.#allPlans.filter(plan => planIds.includes(plan.id));

    const placesPlans = this.#getPlacesPlans(places, this.#allPlans);
    const planPlaces = this.#getPlansPlaces(plans);

    const filteredPlaces = places.filter(place => planPlaces.some(({ id }) => id === place.id));
    const filteredPlans = plans.filter(plan => placesPlans.some(({ id }) => id === plan.id));

    return {
      // Places survive on their own in single-plan mode: pruning them by plan is what makes a newly
      // picked place vanish once the selection is capped to one.
      placeIds: this.singlePlanSelection() ? placeIds : filteredPlaces.map(({ id }) => id),
      planIds: filteredPlans.map(({ id }) => id),
    };
  }

  async #requestQueryParams(queryParams: ThreeSixtyQueryParams): Promise<void> {
    try {
      const navigated = await this.#navigate(queryParams);
      if (!navigated) {
        this.#releaseExpectation(queryParams);
      }
    } catch (error: unknown) {
      this.#releaseExpectation(queryParams);
      throw error;
    }
  }

  #saveSelectionInLocalStorage(selection: ThreeSixtySelection): void {
    const newValue: string = JSON.stringify(selection);
    localStorage.setItem(ThreeSixtyAnalyticsFiltersComponent.threeSixtyReportsLastSelectionKey, newValue);
  }

  #selectWhenUnique<U extends SelectOption, T = SelectOption['id']>(values: T[], options: U[]): T[] {
    const [onlyOption] = options;
    if (options.length !== 1 || onlyOption === undefined || values.includes(onlyOption.id)) {
      return values;
    }
    return [...values, onlyOption.id];
  }

  #statusToSelectStatusOption(status: PlanStatus): SelectStatusOption {
    return {
      id: status,
      title: this.#translateService.instant(`filters.${status}Events`),
    };
  }

  /**
   * The city whose currency stands for "local". Resolved against the options the picker actually
   * offers — the status-filtered ones — and in their order, because that is the city the picker will
   * show as first selected, and deriving the pinned currency and its single option from different
   * cities is how they end up disagreeing. Resolving against every city instead would let one the
   * status filter removed supply a currency that `#getCurrencyOptions` never offers, since that list
   * is built from `selectedCityOptions`, a subset of these.
   */
  #firstSelectedCity(cityIds: number[], cityOptions: Array<CityOption>): CityOption | undefined {
    return cityOptions.find(({ id }) => cityIds.includes(id));
  }

  /**
   * `SearchBarAdapter` stores a city that carries no currency as `''`, and `CityOption.currency` is
   * typed `string | null` besides. Neither is treated as missing by `??`. Returning one would put an
   * empty currency in the url and in the embed parameters, where it also blocks every later nullish
   * fallback — so anything falsy is normalised away here.
   */
  #firstSelectedCityCurrency(cityIds: number[], cityOptions: Array<CityOption>): string | undefined {
    const currency: string | null | undefined = this.#firstSelectedCity(cityIds, cityOptions)?.currency;
    return currency ? currency : undefined;
  }

  #syncCurrencySelection(currency: string | undefined, cityIds: number[], cityOptions: Array<CityOption>): string | undefined {
    /**
     * Both sides go through `#firstSelectedCity` so they answer the same question the currency does:
     * which city the picker shows first. Comparing the raw `cityIds[0]` instead made a reordering of
     * the same set look like a city change — the stored ids keep the order they arrived in, while
     * `#updateQueryParamsFromCurrentSelection` rewrites the url in picker order — and the branch
     * below then threw away an explicit currency in favour of that city's own.
     */
    const firstCityId: number | undefined = this.#firstSelectedCity(cityIds, cityOptions)?.id;
    const previousFirstCityId: number | undefined = this.#firstSelectedCity(
      this.previousThreeSixtySelection?.cityIds ?? [],
      cityOptions,
    )?.id;
    const cityCurrency: string | undefined = this.#firstSelectedCityCurrency(cityIds, cityOptions);

    // Pinned rather than defaulted: the picker offers nothing else while the lock is on, so a stale
    // value from the url would leave the button showing a currency the options no longer contain.
    if (this.currencyLockedToLocal()) {
      return cityCurrency ?? this.#defaultCurrency.id;
    }

    if (this.previousThreeSixtySelection !== undefined && previousFirstCityId !== firstCityId) {
      return cityCurrency ?? this.#defaultCurrency.id;
    }

    /**
     * A cold load carries no currency of its own — clicking an event in the list sends the plan and
     * the city but never a currency. Falling back to the event's own currency rather than a global
     * USD is what keeps the figures on screen matching the event that was clicked. The city's
     * currency is always offered by `#getCurrencyOptions`, so this can never select a missing option.
     */
    return currency ?? cityCurrency ?? this.#defaultCurrency.id;
  }

  #syncPlansAndPlacesSelections(planIds: number[], placeIds: number[]): { placeIds: number[]; planIds: number[] } {
    const { placeIds: addedPlaceIds, planIds: addedPlanIds } = this.#addPlansAndPlacesRelatedSelections(planIds, placeIds);
    return this.#removePlansAndPlacesInvalidSelections(addedPlanIds, addedPlaceIds);
  }

  #syncSelection(threeSixtySelection: ThreeSixtySelection): ThreeSixtySelection {
    const syncedSelection = this.#syncPlansAndPlacesSelections(threeSixtySelection.planIds, threeSixtySelection.placeIds);

    return {
      ...threeSixtySelection,
      ...syncedSelection,
      planIds: this.#capPlanIds(syncedSelection.planIds),
    };
  }

  #updateCurrencyOption(currencyOptions: Array<SelectOption>, currency?: string): void {
    // While locked the only option is the local currency, so falling back to the global default
    // would put the button out of step with what the dashboard is actually rendering.
    const fallback = this.currencyLockedToLocal() ? (currencyOptions[0] ?? this.#defaultCurrency) : this.#defaultCurrency;
    this.selectedCurrencyOption = currencyOptions.find(option => option.id === currency) || fallback;
  }

  #updateCurrencyOptions(): void {
    this.currencyOptions = this.#getCurrencyOptions();
    this.#updateCurrencyOption(this.currencyOptions, this.selectedCurrencyOption?.id);
  }

  #updateQueryParams(selection: ThreeSixtySelection): void {
    void this.#navigate(toThreeSixtyQueryParams(selection));
  }

  #updateQueryParamsFromCurrentSelection(): void {
    this.#updateQueryParams(this.#withPersistedSelection(this.#getCurrentSelection()));
  }

  #updateQueryParamsFromPick(): void {
    const queryParams = toThreeSixtyQueryParams(this.#withPersistedSelection(this.#getCurrentSelection()));
    if (this.#expectedQueryParams !== null && areThreeSixtyQueryParamsEqual(queryParams, this.#expectedQueryParams)) {
      return;
    }

    this.#expectedQueryParams = queryParams;
    void this.#requestQueryParams(queryParams);
  }

  /**
   * What reaches the url and `localStorage`, as opposed to what is painted. Both the capped plans
   * and the pinned currency are views for the duration of a tab; persisting them would make leaving
   * the tab lose the selection the partner arrived with.
   */
  #withPersistedSelection(selection: ThreeSixtySelection): ThreeSixtySelection {
    return {
      ...selection,
      ...(this.singlePlanSelection() ? { planIds: this.#persistedPlanIds } : {}),
      ...(this.currencyLockedToLocal() && this.#persistedCurrency !== undefined ? { currency: this.#persistedCurrency } : {}),
    };
  }

  #updateSelectionWithSelectedOptions(
    threeSixtySelection: ThreeSixtySelection,
    cityOptions: CityOption[],
    placeOptions: SelectPlaceOption[],
    planOptions: MultiSelectPlanOption[],
  ): ThreeSixtySelection {
    const { cityIds, currency, placeIds, planIds } = threeSixtySelection;
    const updatedCityIds = this.#selectWhenUnique(cityIds, cityOptions);

    return {
      ...threeSixtySelection,
      cityIds: updatedCityIds,
      currency: this.#syncCurrencySelection(currency, updatedCityIds, cityOptions),
      placeIds: this.#selectWhenUnique(placeIds, placeOptions),
      // `#selectWhenUnique` can push a second id back in when the surviving plan is not among the
      // available options, so the cap is applied again here rather than only in `#syncSelection`.
      planIds: this.#capPlanIds(this.#selectWhenUnique(planIds, planOptions)),
    };
  }
}
