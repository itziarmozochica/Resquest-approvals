import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  computed,
  DestroyRef,
  effect,
  EventEmitter,
  inject,
  Injector,
  Input,
  input,
  NgZone,
  OnChanges,
  OnInit,
  Output,
  Signal,
  signal,
  SimpleChanges,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';

import { isString } from '@fz-original/app/app/utils/ts/ts.util';
import { TrackingService } from '@fz-original/app/core/tracking/tracking.service';
import { DropdownService } from '@fz-original/app/shared/dropdown/dropdown.service';
import { SpinnerService } from '@fz-original/app/shared/layout/spinner/spinner.service';
import { OptimizelyService } from '@fz-original/app/shared/optimizely/optimizely.service';
import { SearchBarOnsiteDefaultsService } from '@fz-original/app/shared/search-bar/service/search-bar-onsite-defaults.service';
import { SearchBarService } from '@fz-original/app/shared/search-bar/service/search-bar.service';
import { B2cSiteService } from '@fz-original/app/shared/services/b2c-site/b2c-site.service';
import { DateService } from '@fz-original/app/shared/services/date/date.service';
import { DualScreenStorageService } from '@fz-original/app/shared/services/dual-screen/dual-screen-storage.service';
import { PartnerService } from '@fz-original/app/shared/services/partner/partner.service';
import { UserService } from '@fz-original/app/shared/services/user/user.service';
import { DateUtil } from '@fz-original/app/shared/utils/date.util';
import { NgbCalendar } from '@ng-bootstrap/ng-bootstrap';
import { TranslateService } from '@ngx-translate/core';
import { EMPTY, ReplaySubject, Subject } from 'rxjs';
import { switchMap, tap } from 'rxjs/operators';

import { BreakpointStateService } from '../../app/services/breakpoint/breakpoint-state.service';
import {
  ScreenTypeaheadInput,
  SelectOptionTypeaheadData,
  SelectOptionTypeaheadEvent,
  SelectOptionTypeaheadEventType,
  SelectOptionTypeaheadInput,
} from '../../core/tracking/core/events/select-option-typeahead';
import { ListPlanItem } from '../../modules/attendees/list-attendees/models/list-plan-item.model';
import { B2CSiteConfiguration } from '../../modules/resellers/models/b2c-site-configuration.model';
import { SelectDropdownCityOption } from '../dropdown/select-dropdown-city-option';
import { SelectDropdownPlanOption } from '../dropdown/select-dropdown-plan-option';
import { FilterDateRange } from '../layout/filters/date-range/date-range.interface';
import { SelectOption } from '../layout/filters/select/select.interface';
import { TypeaheadEvent } from '../layout/filters/typeahead/typeahead-event.model';
import { TypeaheadComponent } from '../layout/filters/typeahead/typeahead.component';
import { OrganizationTypeEnum } from '../models/partner/organization-type.enum';
import { Partner } from '../models/partner/partner.model';
import { PlanReviewRequestStatus } from '../models/plan-review/plan-review-request.model';
import { PlanFilterOption } from '../models/plan/plan-filter.model';
import { PlanKind } from '../models/plan/plan-kind.enum';
import { PlanStatus } from '../models/plan/plan-status.enum';
import { DistributorSessionState } from '../services/distributor/distributor-session-state.enum';
import { DistributorSessionStore } from '../services/distributor/distributor-session.store';
import { DistributorTargetService } from '../services/distributor/distributor-target.service';
import { ReservationContextService } from '../services/distributor/reservation-context.service';
import { Permissions } from '../services/user/permissions';
import { SearchBarFilter } from './enums/search-bar-filter.enum';
import { CityOption } from './models/city-option.model';
import { ONSITE_SETUP_FILTERS, OnsiteSetupDefaults, SEARCH_BAR_SELECTION_QUERY_PARAMS } from './models/onsite-setup-defaults.model';
import { PlaceOption } from './models/place-option.model';
import { SearchBarB2CSiteMappedConfig } from './models/search-bar.options';
import { SearchFilter } from './models/search-filter.model';
import { DISTRIBUTOR_PARTNER_QUERY_PARAM } from './utils/distributor-partner-param.util';
import {
  buildPlanListKindOptions,
  buildPlanListReviewStatusFilterDefinitions,
  buildPlanListReviewStatusOptions,
  buildPlanListStatusOptions,
  ReviewStatusFilterOptionDefinition,
} from './utils/plan-list-filter-options.util';
import {
  filterListPlansByContext,
  getDistinctPlanKinds,
  getDistinctPlanStatuses,
  ReviewStatusFilterDefinition,
} from './utils/plan-list-search-filters.util';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class.search-bar--surface]': 'surfaceLayout()' },
  selector: 'app-search-bar',
  standalone: false,
  styleUrl: './search-bar.component.scss',
  templateUrl: './search-bar.component.html',
})
export class SearchBarComponent implements OnInit, OnChanges {
  #b2cSiteConfigurations: B2CSiteConfiguration[] = [];
  #b2cSiteService = inject(B2cSiteService);
  #breakpointStateService = inject(BreakpointStateService);
  #calendar = inject(NgbCalendar);
  #changeDetectorRef = inject(ChangeDetectorRef);
  #channelSelected$ = new ReplaySubject<string | undefined>();
  #checkXSMobile = () => {
    if (this.#isMobile()) {
      this.#searchBarVisibility();
    }
  };
  #dateService = inject(DateService);
  #destroyRef = inject(DestroyRef);
  #dropdownService = inject(DropdownService);
  #dualScreenStorageService = inject(DualScreenStorageService);
  #isDefaultFilter = true;
  #isMobile: Signal<boolean> = this.#breakpointStateService.getStateProp('isMobile');
  #ngZone = inject(NgZone);
  #onsiteDefaults: OnsiteSetupDefaults | null = null;
  // Set when the onsite city was applied on a screen that leaves the plan out of `preselectOnsiteFilters`,
  // so the first load keeps the plan on "All events" instead of auto-picking the city's only plan.
  #keepsOnsitePlanOpen = false;
  #optimizelyService = inject(OptimizelyService);
  #partner: Partner | null;
  #partnerSelected$ = new ReplaySubject<number | undefined>();
  #partnerService = inject(PartnerService);
  #places: PlaceOption[] = [];
  #plans: ListPlanItem[] = [];
  #plansAllKinds: ListPlanItem[] = [];
  #route = inject(ActivatedRoute);
  #router = inject(Router);
  #searchBarService = inject(SearchBarService);
  #spinner = inject(SpinnerService);
  #trackingService = inject(TrackingService);
  #translateService = inject(TranslateService);
  #userService = inject(UserService);
  readonly #reservationContext = inject(ReservationContextService);
  readonly #distributorTarget = inject(DistributorTargetService);
  readonly #distributorSession = inject(DistributorSessionStore);
  readonly #injector = inject(Injector);
  readonly #onsiteDefaultsService = inject(SearchBarOnsiteDefaultsService);
  readonly #mandatoryFiltersStatus = signal({ hasAllMandatoryFilters: false });
  #planListFiltersInitialized = false;
  #planListFiltersFromUrlValidated = false;
  #planListMasterKindOptions: PlanFilterOption[] = [];
  #planListMasterStatusOptions: PlanFilterOption[] = [];
  #planListReviewStatusDefinitions: ReadonlyArray<ReviewStatusFilterOptionDefinition> = [];
  #planListReviewStatusOptions: PlanFilterOption[] = [];
  #planListSelectAllLabel = 'All';
  @Input() channelId: string | undefined;
  channelsDropdownOptions: SelectOption[] = [];
  citiesDropdownOptions: CityOption[] = [];
  cleanChannel$ = new Subject<void>();
  cleanCity$ = new Subject<void>();
  cleanDate$ = new Subject<void>();
  cleanPlace$ = new Subject<void>();
  cleanPlan$ = new Subject<void>();
  static readonly defaultSearchBarMandatoryFilters: SearchBarFilter[] = [
    SearchBarFilter.city,
    SearchBarFilter.plan,
    SearchBarFilter.place,
    SearchBarFilter.dateRange,
  ];
  @Input() disabled = false;
  static readonly filtersDependencyOrder = [SearchBarFilter.city, SearchBarFilter.plan, SearchBarFilter.place];
  filterType = SearchBarFilter;
  @Output() hasAllMandatoryFilters = new EventEmitter<boolean>();
  readonly mandatoryFiltersStatus = this.#mandatoryFiltersStatus.asReadonly();
  initialChannelOption: SelectOption | undefined;
  initialCityOption: SelectDropdownCityOption | string | undefined;
  initialDateRange: FilterDateRange | null = null;
  initialPartnerOption: SelectOption | undefined;
  initialPlaceOption: SelectOption | string | undefined;
  initialPlanOption: SelectDropdownPlanOption | string | undefined;
  @Input() mandatoryFilters: SearchBarFilter[] = SearchBarComponent.defaultSearchBarMandatoryFilters;
  @Input() lockedFilters: SearchBarFilter[] = [];
  @Input() maxDateRange: number | undefined;
  @Input() partnerId: number | undefined;
  @Input() planKindFilter: PlanKind[] | undefined;
  @Input() planReviewStatusFilter: PlanReviewRequestStatus[] | undefined;
  @Input() planStatusFilter: PlanStatus[] | undefined;
  // Fallback option used to honor a URL planId that isn't in this search bar's own plan
  // set (e.g. a booking-agent plan forwarded from the make-reservation flow), so it stays selected
  // and isn't stripped from the URL. Only consumers that pass it are affected.
  readonly planUrlFallback = input<SelectDropdownPlanOption>();
  partnersDropdownOptions: SelectOption[] = [];
  placesDropdownOptions: SelectOption[] = [];
  planDropdownOptions: SelectDropdownPlanOption[] = [];
  @Input() preselectActiveCity = true;
  @Input() preselectActivePlan = true;
  // Preselects the city, venue and last used plan of the onsite setup stored on this device when
  // nothing else does: the URL, the single-city and active-city/plan preselection come first. On by
  // default; a disabled bar never takes it, and a screen whose context comes from elsewhere (a flow
  // with its own setup, an order being edited) turns it off.
  readonly preselectFromOnsiteSetup = input(true);
  // Which of the onsite setup's city, plan and venue `preselectFromOnsiteSetup` may fill. A screen
  // that leaves the plan out keeps it on "All events" instead of auto-picking one for the city.
  readonly preselectOnsiteFilters = input<readonly SearchBarFilter[]>(ONSITE_SETUP_FILTERS);
  @Input() screen: ScreenTypeaheadInput | undefined;
  @Input() searchButtonLabel = 'common.show';
  @Input() searchOnChange = false;
  @Output() searchDataSelected = new EventEmitter<boolean>();
  @Output() searchEmitter = new EventEmitter<SearchFilter>();
  selectedChannel: SelectOption | undefined;
  selectedCity: SelectDropdownCityOption | undefined;
  selectedPartner: SelectOption | undefined;
  selectedPlace: SelectOption | undefined;
  selectedPlan: SelectDropdownPlanOption | undefined;
  selectedRange: FilterDateRange | null = null;
  selectOptionTypeaheadInput = SelectOptionTypeaheadInput;
  @Input() showCalendar = false;
  @Input() showChannels = false;
  readonly distributorPartners = input<SelectOption[]>([]);
  readonly selectedDistributorPartner = input<SelectOption | undefined>();
  showId = this.#optimizelyService.isFeatureEnabled('search_bar_shows_id') ?? false;
  @Input() showPartners = false;
  @Input() showPlan = true;
  @Input() showVenue = false;
  readonly surfaceLayout = input(false);
  @Input() extendedFiltersLayout = false;
  @Input() showPlanListFilters = false;
  planListKindOptions: PlanFilterOption[] = [];
  planListStatusOptions: PlanFilterOption[] = [];
  selectedPlanListKind: PlanFilterOption | null = null;
  selectedPlanListStatus: PlanFilterOption | null = null;
  typedCity: string | SelectOption | undefined;
  typedPlace: string | SelectOption | undefined;
  typedPlan: string | SelectOption | undefined;
  @Input() typedSearchFilters: string[] = [];
  @Input() useDefaultDateRange = true;
  // See planUrlFallback — same purpose for a URL venueId not in this search bar's place set.
  readonly venueUrlFallback = input<SelectOption>();

  useIdInSearch = this.#optimizelyService.isFeatureEnabled('search_bar_uses_id_in_search') ?? false;

  constructor() {
    this.#partner = this.#partnerService.getPartner();
    this.#breakpointStateService.observeBreakpoint(this.#destroyRef, this.#checkXSMobile);
  }

  checkSelectedCity(event: TypeaheadEvent): void {
    const cityOption: string | SelectOption = event.selectedOption || '';
    if (this.typedSearchFilters && this.typedSearchFilters.includes(SelectOptionTypeaheadInput.city) && typeof cityOption === 'string') {
      this.typedCity = cityOption;
      if (!cityOption) {
        this.#cleanDependantFilters(SearchBarFilter.city);
      }
      if (event.event.code === 'Enter') {
        this.#isDefaultFilter = false;
        this.#updateQueryParams();
        this.#emitFilters();
        this.#sendEnterMixpanelEvent(this.typedCity, SelectOptionTypeaheadInput.city);
      }
      return;
    }
    if (this.#isSelectAllOption(cityOption as SelectOption) || !(cityOption as SelectOption).id) {
      const previousCityId = this.selectedCity?.id ?? null;
      const previousPlaceId = this.selectedPlace?.id ?? null;
      this.#cleanDependantFilters(SearchBarFilter.city);
      if (this.showPlanListFilters) {
        this.#handlePlanListContextChange(previousCityId, null, previousPlaceId, null);
        this.#syncPlanListPlanDropdown();
      }
      this.#updateQueryParams();
      if (cityOption === '' || this.#isSelectAllOption(cityOption as SelectOption)) {
        this.#requestSearchAfterFilterChange();
      }
    }
  }

  checkSelectedPlace(event: TypeaheadEvent): void {
    const placeOption: string | SelectOption = event.selectedOption || '';
    if (this.typedSearchFilters && this.typedSearchFilters.includes(SelectOptionTypeaheadInput.venue) && typeof placeOption === 'string') {
      this.typedPlace = placeOption;
      if (!placeOption) {
        this.#cleanDependantFilters(SearchBarFilter.place);
      }
      if (event.event.code === 'Enter') {
        this.#isDefaultFilter = false;
        this.#updateQueryParams();
        this.#emitFilters();
        this.#sendEnterMixpanelEvent(this.typedPlace, SelectOptionTypeaheadInput.venue);
      }
      return;
    }
    if (this.#isSelectAllOption(placeOption as SelectOption) || !(placeOption as SelectOption).id) {
      const previousPlaceId = this.selectedPlace?.id ?? null;
      this.#cleanDependantFilters(SearchBarFilter.place);
      if (this.showPlanListFilters) {
        this.#handlePlanListContextChange(this.selectedCity?.id ?? null, this.selectedCity?.id ?? null, previousPlaceId, null);
        this.#syncPlanListPlanDropdown();
      } else if (this.isFilterLocked(SearchBarFilter.place)) {
        this.#updatePlanAndPlaceDropdown();
      } else {
        this.planDropdownOptions = this.#getPlanDropdownOptions();
      }
      this.#updateQueryParams();
      if (placeOption === '' || this.#isSelectAllOption(placeOption as SelectOption)) {
        this.#requestSearchAfterFilterChange();
      }
    }
  }

  checkSelectedPlan(event: TypeaheadEvent): void {
    const planOption: string | SelectOption = event.selectedOption || '';
    if (this.typedSearchFilters && this.typedSearchFilters.includes(SelectOptionTypeaheadInput.plan) && typeof planOption === 'string') {
      const hadTypedPlan = isString(this.typedPlan) && this.typedPlan !== '';
      this.typedPlan = planOption;
      if (!planOption) {
        this.#cleanDependantFilters(SearchBarFilter.plan);
      }
      if (this.searchOnChange && hadTypedPlan && !planOption) {
        this.#isDefaultFilter = false;
        this.#updateQueryParams();
        this.#requestSearchAfterFilterChange();
        return;
      }
      if (event.event.code === 'Enter') {
        this.#isDefaultFilter = false;
        this.#updateQueryParams();
        this.#emitFilters();
        this.#sendEnterMixpanelEvent(this.typedPlan, SelectOptionTypeaheadInput.plan);
      }
      return;
    }
    if (!(planOption as SelectOption).id) {
      this.#cleanDependantFilters(SearchBarFilter.plan);
      this.planDropdownOptions = this.#getPlanDropdownOptions();
      this.#updateQueryParams();
      if (planOption === '') {
        this.#requestSearchAfterFilterChange();
      }
    }
  }

  clearAllFilters(): void {
    this.#cleanCity(false);
    this.#cleanPlan(false);
    this.#cleanPlace(false);
    this.#cleanDateRange();
    this.#updateQueryParams();
    this.#emitFilters();
  }

  clearFiltersExceptCity(): void {
    this.#cleanPlan(false);
    this.#cleanPlace(false);
    this.#cleanDateRange();
    this.#updateQueryParams();
    this.#emitFilters();
  }

  clickOnSearchButton(): void {
    this.#updateQueryParams();
    this.#emitFilters();
  }

  findCityForPlan(planId: number): SelectDropdownCityOption | undefined {
    return this.citiesDropdownOptions.find(city => {
      const plans = this.#dropdownService.getPlanDropdownOptions(this.#plans, city.id);
      return plans.some(plan => plan.id === planId);
    });
  }

  getDualScreenClass(name: string): string | null {
    return this.#dualScreenStorageService.containsData() ? `filters-block--dual-screen filters-block--dual-screen--${name}` : null;
  }

  isFilterDisabled(filter: SearchBarFilter): boolean {
    return this.disabled || !this.#areAllPreviousMandatoryFiltersFilled(filter);
  }

  isFilterLocked(filter: SearchBarFilter): boolean {
    return this.lockedFilters.includes(filter);
  }

  hasPreselectedFilters(): boolean {
    const hasTypedPlan = isString(this.typedPlan) && this.typedPlan !== '';
    return this.selectedCity !== undefined || this.selectedPlace !== undefined || this.selectedPlan !== undefined || hasTypedPlan;
  }

  isSelectAllCities(): boolean {
    return !this.mandatoryFilters.includes(this.filterType.city) && this.citiesDropdownOptions?.length > 1;
  }

  isSelectAllPlaces(): boolean {
    return !this.mandatoryFilters.includes(this.filterType.place) && this.placesDropdownOptions?.length > 1;
  }

  isSelectAllPlans(): boolean {
    return !this.mandatoryFilters.includes(this.filterType.plan) && this.planDropdownOptions?.length > 1;
  }

  isSelectAllPlanListKind(): boolean {
    return this.planListKindOptions.length > 1;
  }

  isSelectAllPlanListStatus(): boolean {
    return this.planListStatusOptions.length > 1;
  }

  onPlanListKindSelected(option?: SelectOption): void {
    if (!this.showPlanListFilters) {
      return;
    }
    this.#isDefaultFilter = false;
    this.#cleanPlan(false);
    this.selectedPlanListKind = option && !this.#isSelectAllOption(option) ? (option as PlanFilterOption) : null;
    this.#refreshPlanListVisibleFilterOptions({ emitSearch: false });
    this.#updateQueryParams();
    this.#emitFilters();
  }

  onPlanListStatusSelected(option?: SelectOption): void {
    if (!this.showPlanListFilters) {
      return;
    }
    this.#isDefaultFilter = false;
    this.#cleanPlan(false);
    this.selectedPlanListStatus = option && !this.#isSelectAllOption(option) ? (option as PlanFilterOption) : null;
    this.#refreshPlanListVisibleFilterOptions({ emitSearch: false });
    this.#updateQueryParams();
    this.#emitFilters();
  }

  setPlanListFilters(kind: SelectOption | null, status: SelectOption | null): void {
    if (!this.showPlanListFilters) {
      return;
    }
    this.selectedPlanListKind = kind && kind.id !== PlanKind.ALL ? (kind as PlanFilterOption) : null;
    this.selectedPlanListStatus = status && status.id !== PlanStatus.ALL ? (status as PlanFilterOption) : null;
    this.#refreshPlanListVisibleFilterOptions({ emitSearch: false });
    this.#applyPlanFilters();
    this.#changeDetectorRef.markForCheck();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['mandatoryFilters'] && !changes['mandatoryFilters'].firstChange) {
      this.#handlePlanIsMandatoryFilterChange(changes['mandatoryFilters'].previousValue, changes['mandatoryFilters'].currentValue);
    }

    if ((changes['planKindFilter'] || changes['planReviewStatusFilter'] || changes['planStatusFilter']) && this.#plansAllKinds.length > 0) {
      this.#applyPlanFilters();
    }
  }

  ngOnInit(): void {
    if (this.showPlanListFilters) {
      this.#initPlanListFilterOptions();
    }
    this.#loadChannels();
    this.#loadFilters();
  }

  searchButtonIsDisabled(): boolean {
    return this.disabled || !this.#areAllThisFilterFilled(this.mandatoryFilters);
  }

  readonly showDistributorPartnersFilter: Signal<boolean> = computed(() => this.distributorPartners().length > 1);

  selectDistributorPartner(partner: SelectOption): void {
    this.#isDefaultFilter = false;
    this.#plansAllKinds = [];
    this.#plans = [];
    this.#places = [];
    this.#cleanCity(true);
    this.#cleanPlan(true);
    this.#cleanPlace(true);
    void this.#changeQueryParams({
      [DISTRIBUTOR_PARTNER_QUERY_PARAM]: String(partner.id),
      cityId: null,
      cityName: null,
      planId: null,
      planName: null,
      venueId: null,
      venueName: null,
    }).then(() => {
      // The chosen partner brings its own channel, and its plans are the ones to ask for. The store is
      // written while the route re-runs its guards, so the channel is only the new one once the
      // navigation has finished.
      this.channelId = this.#reservationContext.reservationChannel();
      this.#updateChannelSelected();
    });
  }

  selectChannel(channel: SelectDropdownCityOption): void {
    this.#isDefaultFilter = false;
    this.#cleanCity(true);
    this.#cleanPlan(true);
    this.#cleanPlace(true);
    this.channelId = channel.id.toString();
    this.selectedChannel = channel;
    this.#selectB2cSiteConfigurationByKey('channelId', this.channelId);
    this.#updateChannelSelected();
    this.#updateQueryParams();
  }

  selectCity(city: SelectDropdownCityOption): void {
    const previousCityId = this.selectedCity?.id ?? null;
    const previousPlaceId = this.selectedPlace?.id ?? null;
    const isAllCities = this.#isSelectAllOption(city);
    this.#isDefaultFilter = false;
    this.#cleanPlan(true);
    this.#cleanPlace(true);
    if (isAllCities) {
      this.#cleanCity(false);
    } else {
      this.selectedCity = city;
      this.typedCity = undefined;
    }
    if (this.showPlanListFilters) {
      this.#handlePlanListContextChange(previousCityId, this.selectedCity?.id ?? null, previousPlaceId, null);
      this.#syncPlanListPlanDropdown();
    } else {
      this.#updatePlansDropdown();
    }
    this.#updateQueryParams();
    this.#requestSearchAfterFilterChange();
  }

  selectDate(range: FilterDateRange): void {
    this.#updateSelectDate(range);
    this.#requestSearchAfterFilterChange();
  }

  selectDateRange(range: FilterDateRange): void {
    this.initialDateRange = range;
    this.selectedRange = range;
    this.#updateQueryParams();
    this.#requestSearchAfterFilterChange();
  }

  selectPartner(partner: SelectDropdownCityOption): void {
    this.#isDefaultFilter = false;
    this.#cleanCity(true);
    this.#cleanPlan(true);
    this.#cleanPlace(true);
    this.partnerId = partner.id;
    this.selectedPartner = partner;
    this.#selectB2cSiteConfigurationByKey('partnerId', this.partnerId);
    this.#updateChannelsDropdownOptions(partner.id);
    this.channelId = this.channelsDropdownOptions[0].id.toString();
    this.selectedChannel = this.channelsDropdownOptions.find(channel => channel.id === this.channelId);
    this.#updatePartnerSelected();
    this.#updateChannelSelected();
    this.#updateQueryParams();
  }

  selectPlace(venueOption: SelectOption): void {
    const previousPlaceId = this.selectedPlace?.id ?? null;
    const isAllVenues = this.#isSelectAllOption(venueOption);
    this.#isDefaultFilter = false;
    if (isAllVenues) {
      this.#cleanPlace(false);
    } else {
      this.selectedPlace = venueOption;
      this.typedPlace = undefined;
    }
    if (this.showPlanListFilters) {
      this.#handlePlanListContextChange(
        this.selectedCity?.id ?? null,
        this.selectedCity?.id ?? null,
        previousPlaceId,
        this.selectedPlace?.id ?? null,
      );
      this.#syncPlanListPlanDropdown();
    } else if (this.isFilterLocked(SearchBarFilter.place)) {
      this.#updatePlanAndPlaceDropdown();
    } else {
      this.planDropdownOptions = this.#getPlanDropdownOptions();
    }
    this.#updateQueryParams();
    this.#requestSearchAfterFilterChange();
  }

  selectPlan(plan: SelectDropdownPlanOption): void {
    this.#isDefaultFilter = false;
    const onsitePlace = this.selectedPlace?.id === this.#onsiteDefaults?.venueId ? this.selectedPlace : undefined;
    if (!this.isFilterLocked(SearchBarFilter.place)) {
      this.#cleanPlace(true);
    }
    this.selectedPlan = plan;
    this.typedPlan = undefined;
    this.#updatePlacesDropdown();
    if (onsitePlace && this.placesDropdownOptions.some(place => place.id === onsitePlace.id)) {
      this.selectedPlace = { ...onsitePlace };
    }
    this.#updateSelectDateByPlanOrCurrentDays(plan);
    this.#updateQueryParams();
    this.#requestSearchAfterFilterChange();
  }

  #areAllPreviousMandatoryFiltersFilled(filter: SearchBarFilter, checkTypedFilters = true): boolean {
    const previousMandatoryFilters = this.#getDependentFilters(filter).filter(testedFilter => this.mandatoryFilters.includes(testedFilter));

    return this.#areAllThisFilterFilled(previousMandatoryFilters, checkTypedFilters);
  }

  #areAllThisFilterFilled(filters: SearchBarFilter[], checkTypedFilters = true): boolean {
    return filters.every(filter => this.#isThisFilterFilled(filter, checkTypedFilters));
  }

  #changeQueryParams(newQueryParams: Record<string, string | SelectOption | null | undefined>): Promise<boolean> {
    const navigated = this.#ngZone.run(() => {
      return this.#router.navigate([], {
        queryParams: newQueryParams,
        queryParamsHandling: 'merge',
        relativeTo: this.#route,
        replaceUrl: true,
        preserveFragment: true,
      });
    });
    this.#changeDetectorRef.markForCheck();

    return navigated;
  }

  #cleanChannel(cleanDropdown: boolean) {
    this.cleanChannel$.next();
    this.channelId = undefined;
    if (cleanDropdown && !this.typedSearchFilters.includes(SelectOptionTypeaheadInput.city)) {
      this.citiesDropdownOptions = [];
    }
  }

  #cleanCity(cleanDropdown: boolean) {
    this.cleanCity$.next();
    this.selectedCity = undefined;
    this.typedCity = undefined;
    if (cleanDropdown && !this.typedSearchFilters.includes(SelectOptionTypeaheadInput.city)) {
      this.citiesDropdownOptions = [];
    }
  }

  #cleanDateRange(): void {
    if (!this.showCalendar || this.mandatoryFilters.includes(SearchBarFilter.dateRange)) {
      return;
    }
    this.selectedRange = null;
    this.cleanDate$.next();
  }

  #cleanDependantFilters(filter: SearchBarFilter): void {
    this.#cleanFilter(filter);
    this.#getDependentFilters(filter, [...SearchBarComponent.filtersDependencyOrder].reverse()).forEach(dependandFilter => {
      if (!this.#areAllPreviousMandatoryFiltersFilled(dependandFilter)) {
        this.#cleanFilter(dependandFilter, true);
      }
    });
  }

  #cleanFilter(filter: SearchBarFilter, cleanDropdown = false): void {
    switch (filter) {
      case SearchBarFilter.channel:
        this.#cleanChannel(cleanDropdown);
        break;
      case SearchBarFilter.city:
        this.#cleanCity(cleanDropdown);
        break;
      case SearchBarFilter.plan:
        this.#cleanPlan(cleanDropdown);
        break;
      case SearchBarFilter.place:
        this.#cleanPlace(cleanDropdown);
        break;
      default:
        return;
    }
  }

  #cleanPlace(cleanDropdown: boolean) {
    this.cleanPlace$.next();
    this.selectedPlace = undefined;
    this.typedPlace = undefined;
    if (cleanDropdown && !this.typedSearchFilters.includes(SelectOptionTypeaheadInput.venue)) {
      this.placesDropdownOptions = [];
    }
  }

  #cleanPlan(cleanDropdown: boolean) {
    this.cleanPlan$.next();
    this.selectedPlan = undefined;
    this.typedPlan = undefined;
    if (cleanDropdown && !this.typedSearchFilters.includes(SelectOptionTypeaheadInput.plan)) {
      this.planDropdownOptions = [];
    }
  }

  #clearSelectedFiltersThatCanChange(): void {
    this.selectedPlan = undefined;
  }

  #computeHasSeatingPlans(): boolean {
    if (this.selectedPlan !== undefined) {
      return this.selectedPlan.hasSeatingProvider === true;
    }
    return this.planDropdownOptions.some(plan => plan.hasSeatingProvider === true);
  }

  #emitFilterCompleteness(): void {
    this.#emitHasAllMandatoryFilters(this.#areAllThisFilterFilled(this.mandatoryFilters, true));
    this.searchDataSelected.emit(this.#areAllThisFilterFilled(this.mandatoryFilters));
  }

  #emitFilters(): void {
    const timezone: string =
      this.selectedCity !== undefined
        ? (this.#places.find((place: PlaceOption) => place.cityId == this.selectedCity?.id)?.cityTimezone ?? '')
        : '';
    /**
     * @observation
     *
     * Here we are assuming that these props are not undefined:
     * * this.selectedCity
     * * this.selectedPlan
     * * this.selectedPlace
     */
    const filters = new SearchFilter(
      this.#partner,
      this.selectedCity as SelectDropdownCityOption,
      this.selectedPlan as SelectOption,
      this.selectedPlace as SelectOption,
      this.selectedRange,
      timezone,
      this.#isDefaultFilter,
      isString(this.typedCity) ? this.typedCity : undefined,
      isString(this.typedPlan) ? this.typedPlan : undefined,
      isString(this.typedPlace) ? this.typedPlace : undefined,
      this.selectedChannel,
      undefined,
      this.#computeHasSeatingPlans(),
      this.showPlanListFilters ? this.selectedPlanListKind : undefined,
      this.showPlanListFilters ? this.selectedPlanListStatus : undefined,
    );
    this.searchEmitter.emit(filters);
    this.#emitHasAllMandatoryFilters(this.#areAllThisFilterFilled(this.mandatoryFilters, true));
    this.#changeDetectorRef.markForCheck();
    this.#searchBarVisibility();
  }

  #emitHasAllMandatoryFilters(hasAllMandatoryFilters: boolean): void {
    this.#mandatoryFiltersStatus.set({ hasAllMandatoryFilters });
    this.hasAllMandatoryFilters.emit(hasAllMandatoryFilters);
  }

  #getCurrentDaysRange(): FilterDateRange {
    const fromDate = this.#calendar.getToday();
    const toDate = this.#calendar.getNext(this.#calendar.getToday(), 'd', 2);

    return {
      endDate: new Date(Date.UTC(toDate.year, toDate.month - 1, toDate.day)),
      startDate: new Date(Date.UTC(fromDate.year, fromDate.month - 1, fromDate.day)),
    };
  }

  #getDateRangeFromPlan(plan: SelectDropdownPlanOption): FilterDateRange | null {
    if (plan.status === undefined) {
      console.warn('Plan status is undefined');

      return null;
    }
    if (this.#isOnSale(plan.status) && plan.nextSessionDate && this.selectedCity) {
      return DateUtil.getNextDays(plan.nextSessionDate, this.selectedCity.timezone);
    }
    if (this.#isOffSale(plan.status) && plan.lastSessionDate && this.selectedCity) {
      return DateUtil.getPreviousDays(plan.lastSessionDate, this.selectedCity.timezone);
    }
    console.warn('Either plan.nextSessionDate, plan.lastSessionDate or this.selectedCity is falsy');

    return null;
  }

  #getDependentFilters(filter: SearchBarFilter, dependencies = SearchBarComponent.filtersDependencyOrder): SearchBarFilter[] {
    const filterIndex = dependencies.findIndex(testedFilter => testedFilter === filter);
    return dependencies.slice(0, Math.max(filterIndex, 0));
  }

  #getPlanDropdownOptions(): SelectDropdownPlanOption[] {
    if (this.showPlanListFilters) {
      return this.#dropdownService.getPlanDropdownOptions(this.#plans);
    }

    const cityId = this.selectedCity?.id;
    const venueId = this.selectedPlace?.id;
    const isVenueLocked = this.isFilterLocked(SearchBarFilter.place);
    const options =
      venueId !== undefined && isVenueLocked
        ? this.#dropdownService.getPlanDropdownOptionsFilteredByVenue(this.#plans, cityId, venueId)
        : this.#dropdownService.getPlanDropdownOptions(this.#plans, cityId);
    return this.#withUrlFallback(options, this.planUrlFallback());
  }

  // Keeps a forwarded URL fallback (a plan/venue not in this search bar's own set) present in the
  // dropdown options, so the reconciliation in #updatePlanAndPlaceDropdown doesn't clear the selection.
  #withUrlFallback<T extends SelectOption>(options: T[], fallback: T | undefined): T[] {
    if (fallback !== undefined && fallback.id !== -1 && !options.some(option => option.id === fallback.id)) {
      return [...options, fallback];
    }
    return options;
  }

  #filterPlansByKind(plans: ListPlanItem[], kindFilter: PlanKind[] | undefined = this.#getActivePlanKindFilter()): ListPlanItem[] {
    if (kindFilter === undefined) {
      return plans;
    }

    return plans.filter(plan => plan.kind !== undefined && kindFilter.includes(plan.kind));
  }

  #filterPlansByReviewStatus(
    plans: ListPlanItem[],
    reviewStatusFilter: PlanReviewRequestStatus[] | undefined = this.#getActivePlanReviewStatusFilter(),
  ): ListPlanItem[] {
    if (reviewStatusFilter === undefined) {
      return plans;
    }

    return plans.filter(plan => plan.reviewStatus !== undefined && reviewStatusFilter.includes(plan.reviewStatus));
  }

  #filterPlansByStatus(plans: ListPlanItem[], statusFilter: PlanStatus[] | undefined = this.#getActivePlanStatusFilter()): ListPlanItem[] {
    if (statusFilter === undefined) {
      return plans;
    }

    return plans.filter(plan => plan.status !== undefined && statusFilter.includes(plan.status));
  }

  #applyPlanFilters(): void {
    let plans = this.#plansAllKinds;
    if (this.showPlanListFilters) {
      plans = filterListPlansByContext(plans, {
        cityId: this.selectedCity?.id ?? null,
        placeId: this.selectedPlace?.id ?? null,
      });
    }
    this.#plans = this.#filterPlansByReviewStatus(this.#filterPlansByStatus(this.#filterPlansByKind(plans)));
    this.#updatePlanAndPlaceDropdown();
    this.#changeDetectorRef.markForCheck();
  }

  #handlePlanIsMandatoryFilterChange(previousFilters: SearchBarFilter[], currentFilters: SearchBarFilter[]): void {
    const wasPlanMandatory = previousFilters.includes(SearchBarFilter.plan);
    const isPlanMandatory = currentFilters.includes(SearchBarFilter.plan);

    if (wasPlanMandatory !== isPlanMandatory) {
      this.#updatePlanAndPlaceDropdown();
    }

    this.#emitHasAllMandatoryFilters(this.#areAllThisFilterFilled(currentFilters, true));
    this.#changeDetectorRef.markForCheck();
  }

  #isOffSale(status: string): boolean {
    return status == PlanStatus.OFF_SALE;
  }

  #isOnSale(status: string): boolean {
    return status == PlanStatus.ON_SALE;
  }

  #isThisFilterFilled(filter: SearchBarFilter, checkTypedFilters: boolean): boolean {
    const typedFiltersToCheck = checkTypedFilters ? this.typedSearchFilters : [];
    switch (filter) {
      case SearchBarFilter.city:
        return Boolean(this.selectedCity || (typedFiltersToCheck.includes(SelectOptionTypeaheadInput.city) && this.typedCity));
      case SearchBarFilter.plan:
        return Boolean(this.selectedPlan || (typedFiltersToCheck.includes(SelectOptionTypeaheadInput.plan) && this.typedPlan));
      case SearchBarFilter.place:
        return Boolean(this.selectedPlace || (typedFiltersToCheck.includes(SelectOptionTypeaheadInput.venue) && this.typedPlace));
      case SearchBarFilter.channel:
        return Boolean(this.selectedChannel || typedFiltersToCheck.includes(SelectOptionTypeaheadInput.channel)); // TODO: typedChannel
      case SearchBarFilter.dateRange:
        return !this.showCalendar || Boolean(this.selectedRange);
      default:
        return false;
    }
  }

  #loadChannelFromUrl(): void {
    const initialChannelId: string | null = this.#route.snapshot.queryParamMap.get('channelId');
    if (initialChannelId !== null) {
      this.initialChannelOption = this.channelsDropdownOptions.find(channel => channel.id === initialChannelId);
      this.selectedChannel = this.initialChannelOption;
      this.channelId = this.initialChannelOption?.id;
    }
  }

  #loadChannels(): void {
    // A distributor organization is of type RESELLER, so it would land in the branch below - but the
    // b2c-site configurations are the reseller's own, and its channel comes from the chosen partner
    // config. Asking anyway answers nothing, and the plans are only requested inside that subscribe.
    if (this.#distributorSession.sessionState() === DistributorSessionState.Unknown) {
      const watcher = effect(
        () => {
          if (this.#distributorSession.sessionState() === DistributorSessionState.Unknown) {
            return;
          }
          watcher.destroy();
          this.#loadChannels();
        },
        { injector: this.#injector },
      );

      return;
    }

    if (this.#distributorTarget.isDistributorSession()) {
      this.channelId = this.#reservationContext.reservationChannel();
      this.#channelSelected$.next(this.channelId);
      return;
    }

    if (this.showChannels && this.#partner?.type === OrganizationTypeEnum.RESELLER) {
      const affiliateId: number | null | undefined = this.#userService.hasPermission(Permissions.CAN_EDIT_NOTIFICATIONS)
        ? null
        : this.#userService.getUserId();
      if (this.#partner !== null && affiliateId !== undefined) {
        this.#b2cSiteService.getB2cSiteConfigurations(this.#partner.id, affiliateId ?? undefined).subscribe(response => {
          if (response.error || !response.data || !response.data.length) {
            return;
          }
          this.partnerId = Number(this.#route.snapshot.queryParamMap.get('partnerId'));
          this.#b2cSiteConfigurations = response.data as B2CSiteConfiguration[];
          this.channelsDropdownOptions = this.#b2cSiteConfigurations
            .map((configuration: B2CSiteConfiguration) => {
              if (!configuration) {
                return undefined;
              }
              const { channelId, name } = configuration;

              return channelId ? { id: channelId, title: name ?? '' } : undefined;
            })
            .filter((channel): channel is SelectOption => !!channel);
          this.#loadChannelFromUrl();
          if (!this.channelId) {
            this.channelId = this.channelsDropdownOptions[0].id;
            this.selectedChannel = this.channelsDropdownOptions[0];
            this.#updateQueryParams();
          }
          this.#selectB2cSiteConfigurationByKey('channelId', this.channelId);
          this.#loadPartners(this.#b2cSiteConfigurations);
          this.#updateChannelSelected();
        });
      }
    } else {
      if (this.#userService.isBusiness() && this.#userService.getUser()?.business) {
        this.channelId = this.#reservationContext.reservationChannel();
      }
      this.#channelSelected$.next(this.channelId);
    }
  }

  #loadCityFromUrl(): void {
    if (this.citiesDropdownOptions.length === 1) {
      this.initialCityOption = this.citiesDropdownOptions[0];
      this.selectedCity = this.initialCityOption;
      if (this.showPlanListFilters) {
        this.#refreshPlanListVisibleFilterOptions({ emitSearch: false });
      } else {
        this.#updatePlansDropdown();
      }
      return;
    }
    const initialCityId: number | typeof NaN = parseInt(this.#route.snapshot.queryParamMap.get('cityId') ?? '');
    if (!isNaN(initialCityId)) {
      this.initialCityOption = this.citiesDropdownOptions.find(city => city.id === initialCityId);
      if (this.initialCityOption) {
        this.selectedCity = this.initialCityOption;
      }
      return;
    }
    const initialCityName = this.#route.snapshot.queryParamMap.get('cityName');
    if (initialCityName && this.typedSearchFilters.includes(SelectOptionTypeaheadInput.city)) {
      this.initialCityOption = initialCityName;
      this.typedCity = initialCityName;
      this.selectedCity = undefined;
      return;
    }
    if (this.preselectActiveCity) {
      const active_cities: CityOption[] = this.citiesDropdownOptions.filter((city: CityOption) => city.activePlansNumber > 0);
      if (active_cities.length === 1) {
        this.initialCityOption = active_cities[0];
        this.selectedCity = this.initialCityOption;
        this.#updatePlansDropdown();
        return;
      }
    }
    // Last resort: only when neither the URL nor the active-city preselection picked a city.
    const onsiteCity = this.citiesDropdownOptions.find(city => city.id === this.#onsiteDefaults?.cityId);
    if (!onsiteCity) {
      return;
    }
    this.initialCityOption = onsiteCity;
    this.selectedCity = onsiteCity;
    if (this.showPlanListFilters) {
      // Fills the city-scoped plans, so the onsite plan can be found in them.
      this.#refreshPlanListVisibleFilterOptions({ emitSearch: false });
    } else {
      this.#keepsOnsitePlanOpen = !this.preselectOnsiteFilters().includes(SearchBarFilter.plan);
      this.#updatePlansDropdown({ autoPickPlan: !this.#keepsOnsitePlanOpen });
    }
  }

  #loadDateRangeFromUrl(): void {
    const incomingStartDate = this.#route.snapshot.queryParamMap.get('dateFrom');
    const incomingEndDate = this.#route.snapshot.queryParamMap.get('dateTo');
    if (incomingStartDate && incomingEndDate) {
      const startDateParts = incomingStartDate.split('-');
      const endDateParts = incomingEndDate.split('-');
      if (startDateParts.length === 3 && endDateParts.length === 3) {
        this.initialDateRange = {
          endDate: new Date(Date.UTC(+endDateParts[0], +endDateParts[1] - 1, +endDateParts[2])),
          startDate: new Date(Date.UTC(+startDateParts[0], +startDateParts[1] - 1, +startDateParts[2])),
        };
      }
    }
  }

  #loadFilters(): void {
    /**
     * We are currently using this component in the kiosk mode
     * and we probably should not.
     *
     * @todo remove.
     */
    if (!this.#userService.isKioskUser()) {
      this.#spinner.show();
    }
    let isSpinnerShow = true;
    this.#channelSelected$
      .pipe(
        switchMap((channelId: string | undefined) => {
          if (this.#partner === null) {
            this.#spinner.hide();
            return EMPTY;
          }

          return this.#searchBarService
            .getSearchBarOptionsUpdated(this.#partner.id, channelId, this.#partner?.type)
            .pipe(tap(() => this.#clearSelectedFiltersThatCanChange()));
        }),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe(response => {
        if (isSpinnerShow) {
          this.#spinner.hide();
          isSpinnerShow = false;
        }
        if (!response || !response.data) {
          this.#plansAllKinds = [];
          if (this.showPlanListFilters) {
            this.#refreshPlanListVisibleFilterOptions({ emitSearch: false });
          }
          this.#applyPlanFilters();
          this.#changeDetectorRef.markForCheck();
          if (this.#areAllThisFilterFilled(this.mandatoryFilters)) {
            this.#emitFilters();
          }
          return;
        }
        /**
         * @todo consolidate ListPlanItem & PlanOption.
         */
        this.#plansAllKinds = response.data.plans as ListPlanItem[];
        this.#places = response.data.places;
        this.citiesDropdownOptions = Object.assign([], response.data.cities);
        const storedOnsiteDefaults =
          this.preselectFromOnsiteSetup() && !this.disabled && this.#partner
            ? this.#pickOnsiteSetupFilters(this.#onsiteDefaultsService.getDefaults(this.#partner.id))
            : null;
        this.#onsiteDefaults = this.#urlSelectsAnyFilter() ? null : storedOnsiteDefaults;
        this.#changeDetectorRef.markForCheck();

        if (this.showPlanListFilters) {
          this.#validatePlanListFiltersFromQueryParams();
        } else {
          this.#applyPlanFilters();
        }

        this.#loadCityFromUrl();
        if (this.#areAllPreviousMandatoryFiltersFilled(SearchBarFilter.plan) && !this.selectedPlan) {
          this.#loadPlanFromUrl();
        }
        if (this.#areAllPreviousMandatoryFiltersFilled(SearchBarFilter.place) && !this.selectedPlace) {
          this.#loadPlaceFromUrl();
        }
        if (
          this.#loadsOnsiteVenueBeforePlan(storedOnsiteDefaults) &&
          !this.#areAllPreviousMandatoryFiltersFilled(SearchBarFilter.place) &&
          !this.selectedPlace
        ) {
          this.#loadPlaceFromUrl();
        }

        if (this.showPlanListFilters) {
          this.#refreshPlanListVisibleFilterOptions({ emitSearch: false });
        } else {
          this.#updatePlanAndPlaceDropdown({ autoPickPlan: !this.#keepsOnsitePlanOpen });
        }
        this.#loadInitialDateRange();
        this.#updateQueryParams();
        if (this.#areAllThisFilterFilled(this.mandatoryFilters)) {
          this.#emitFilters();
        }
      });
  }

  #loadInitialDateRange(): void {
    if (!this.showCalendar) {
      return;
    }
    this.#loadDateRangeFromUrl();
    if (this.initialDateRange === null) {
      this.#updateSelectDateByPlanOrCurrentDays(this.selectedPlan);
    }
    this.selectedRange = this.initialDateRange;
  }

  #loadPartnerFromUrl(): void {
    const initialPartnerId = Number(this.#route.snapshot.queryParamMap.get('partnerId'));
    if (initialPartnerId !== 0) {
      this.initialPartnerOption = this.partnersDropdownOptions.find(partner => {
        return partner.id.toString() === initialPartnerId;
      });
      this.selectedPartner = this.initialPartnerOption;
      this.partnerId = this.initialPartnerOption?.id;
    }
  }

  #loadPartners(b2cSiteConfigurations: B2CSiteConfiguration[]): void {
    if (this.showPartners && this.#partner?.type === OrganizationTypeEnum.RESELLER) {
      this.partnersDropdownOptions = b2cSiteConfigurations
        .map(this.#mapB2CSiteConfigurations)
        .filter((partner): partner is SearchBarB2CSiteMappedConfig => !!partner)
        .reduce((acc: SearchBarB2CSiteMappedConfig[], item: SearchBarB2CSiteMappedConfig) => {
          if (!acc.some((partner: SearchBarB2CSiteMappedConfig) => partner.id === item.id)) {
            return [...acc, item];
          }
          return acc;
        }, []) as Pick<SelectOption, 'id' | 'title' | 'channelId'>[];
      this.#loadPartnerFromUrl();
      if (!this.partnerId) {
        this.initialPartnerOption = this.partnersDropdownOptions[0];
        this.partnerId = this.partnersDropdownOptions[0].id;
        this.selectedPartner = this.partnersDropdownOptions[0];
      }
      if (this.partnerId !== undefined) {
        this.#updateChannelsDropdownOptions(this.partnerId);
        this.#selectB2cSiteConfigurationByKey('partnerId', this.partnerId);
      }
      this.#updatePartnerSelected();
      this.#updateChannelSelected();
    } else {
      this.#partnerSelected$.next(this.partnerId);
    }
  }

  #loadPlaceFromUrl(): void {
    const initialPlaceId: number | typeof NaN = parseInt(this.#route.snapshot.queryParamMap.get('venueId') ?? '');
    if (!isNaN(initialPlaceId)) {
      const initialPlace = this.#places.find(place => place.id === initialPlaceId);
      const venueFallback = this.venueUrlFallback();
      this.initialPlaceOption = initialPlace
        ? { id: initialPlace.id, title: initialPlace.name }
        : venueFallback?.id === initialPlaceId
          ? { id: venueFallback.id, title: venueFallback.title }
          : undefined;
      this.selectedPlace = this.initialPlaceOption;
      return;
    }
    const initialPlaceName = this.#route.snapshot.queryParamMap.get('venueName');
    if (initialPlaceName && this.typedSearchFilters.includes(SelectOptionTypeaheadInput.venue)) {
      this.initialPlaceOption = initialPlaceName;
      this.typedPlace = initialPlaceName;
      return;
    }
    this.#loadOnsitePlace();
  }

  #loadOnsitePlace(): void {
    // A hidden venue field is never filled: the user could neither see nor clear it.
    if (!this.showVenue) {
      return;
    }
    // Only a venue that matches the selected city and plan, so the preselection stays consistent.
    const placeOptions = this.#dropdownService.getPlaceDropdownOptions(this.#places, this.selectedCity?.id, this.selectedPlan?.id);
    const onsitePlace = placeOptions.find(place => place.id === this.#onsiteDefaults?.venueId);
    if (onsitePlace) {
      this.initialPlaceOption = onsitePlace;
      this.selectedPlace = onsitePlace;
      this.placesDropdownOptions = placeOptions;
    }
  }

  #loadPlanFromUrl(): void {
    const initialPlanId: number | typeof NaN = parseInt(this.#route.snapshot.queryParamMap.get('planId') ?? '');
    if (!isNaN(initialPlanId)) {
      const initialPlan: ListPlanItem | undefined = this.#plans.find(plan => plan.id === initialPlanId);
      const planFallback = this.planUrlFallback();
      this.initialPlanOption =
        initialPlan !== undefined ? this.#toPlanOption(initialPlan) : planFallback?.id === initialPlanId ? planFallback : undefined;
      this.selectedPlan = this.initialPlanOption;
      return;
    }
    const initialPlanName = this.#route.snapshot.queryParamMap.get('planName');
    if (initialPlanName && this.typedSearchFilters.includes(SelectOptionTypeaheadInput.plan)) {
      this.initialPlanOption = initialPlanName;
      this.typedPlan = initialPlanName;
      return;
    }
    // A hidden plan field is never filled: it would silently narrow the venues the user can pick.
    if (!this.showPlan) {
      return;
    }
    // Only a plan offered for the selected city, otherwise the user picks it as before.
    const onsitePlan = this.#getPlanDropdownOptions().find(plan => plan.id === this.#onsiteDefaults?.planId);
    if (onsitePlan) {
      this.initialPlanOption = onsitePlan;
      this.selectedPlan = onsitePlan;
    }
  }

  #mapB2CSiteConfigurations(configuration: B2CSiteConfiguration): SearchBarB2CSiteMappedConfig | undefined {
    if (!configuration) {
      return undefined;
    }
    const { channelId, partnerId, partnerName } = configuration;

    return { channelId, id: partnerId, title: partnerName ?? '' };
  }

  #meetsCriteriaForPreselectedActivePlan(): boolean {
    return (
      this.preselectActivePlan && !(this.#route.snapshot.queryParamMap.has('cityId') && this.#route.snapshot.queryParamMap.has('planId'))
    );
  }

  // The onsite venue may load while the mandatory plan is still empty: on the first load from the
  // onsite setup, and on a reload whose URL carries the onsite venue that first load wrote there.
  #loadsOnsiteVenueBeforePlan(storedOnsiteDefaults: OnsiteSetupDefaults | null): boolean {
    if (storedOnsiteDefaults?.venueId === undefined) {
      return false;
    }
    const urlVenueId = parseInt(this.#route.snapshot.queryParamMap.get('venueId') ?? '');
    return this.#onsiteDefaults?.venueId !== undefined || urlVenueId === storedOnsiteDefaults.venueId;
  }

  #pickOnsiteSetupFilters(defaults: OnsiteSetupDefaults | null): OnsiteSetupDefaults | null {
    if (!defaults) {
      return null;
    }
    const filters = this.preselectOnsiteFilters();

    return {
      cityId: filters.includes(SearchBarFilter.city) ? defaults.cityId : undefined,
      planId: filters.includes(SearchBarFilter.plan) ? defaults.planId : undefined,
      venueId: filters.includes(SearchBarFilter.place) ? defaults.venueId : undefined,
    };
  }

  #urlSelectsAnyFilter(): boolean {
    const queryParamMap = this.#route.snapshot.queryParamMap;
    return SEARCH_BAR_SELECTION_QUERY_PARAMS.some(param => queryParamMap.has(param));
  }

  #requestSearchAfterFilterChange(): void {
    if (this.searchOnChange && this.searchButtonIsDisabled()) {
      this.#emitFilterCompleteness();
      return;
    }
    this.#emitFilters();
  }

  #searchBarVisibility(): void {
    if (this.#isMobile()) {
      this.searchDataSelected.emit(this.#areAllThisFilterFilled(this.mandatoryFilters));
      this.#changeDetectorRef.markForCheck();
    }
  }

  #selectB2cSiteConfigurationByKey(configKey: keyof B2CSiteConfiguration, compareValue: string | number | undefined): void {
    const b2cSiteConfiguration: B2CSiteConfiguration | undefined = this.#b2cSiteConfigurations.find(
      (config: B2CSiteConfiguration) => config[configKey] === compareValue,
    );
    if (b2cSiteConfiguration !== undefined) {
      this.#b2cSiteService.select(b2cSiteConfiguration);
    }
  }

  #sendEnterMixpanelEvent(typed: string, inputType: SelectOptionTypeaheadInput): void {
    const mixpanelEvent: SelectOptionTypeaheadData = {
      event: SelectOptionTypeaheadEventType.enter,
      inputType,
      screen: this.screen,
      selectedOption: undefined,
      typed,
    };
    this.#trackingService.track(new SelectOptionTypeaheadEvent(mixpanelEvent));
  }

  #updateChannelsDropdownOptions(partnerId: number): void {
    this.channelsDropdownOptions = this.#b2cSiteConfigurations
      .filter(config => config.partnerId === partnerId)
      .map(configuration => {
        if (!configuration) {
          return undefined;
        }
        const { channelId, name } = configuration;

        return channelId ? { id: channelId, title: name ?? '' } : undefined;
      })
      .filter((channel): channel is SelectOption => !!channel);
  }

  #updateChannelSelected(): void {
    this.#channelSelected$.next(this.channelId);
  }

  #updatePartnerSelected(): void {
    this.#partnerSelected$.next(this.partnerId);
  }

  #toPlanOption(plan: ListPlanItem): SelectDropdownPlanOption {
    return {
      hasDeclarativeInventory: plan.hasDeclarativeInventory,
      hasSeatingProvider: plan.hasSeatingProvider,
      id: plan.id,
      isAssetBased: plan.isAssetBased,
      lastSessionDate: plan.lastSessionDate,
      lastSessionDateRegardlessOfExpirationAndAttendance: plan.lastSessionDateRegardlessOfExpirationAndAttendance,
      nextSessionDate: plan.nextSessionDate,
      nextSessionDateRegardlessOfAttendance: plan.nextSessionDateRegardlessOfAttendance,
      status: plan.status,
      title: plan.name,
    };
  }

  #updatePlacesDropdown(): void {
    if (!this.#areAllPreviousMandatoryFiltersFilled(SearchBarFilter.place, false)) {
      return;
    }
    this.placesDropdownOptions = this.#withUrlFallback(
      this.#dropdownService.getPlaceDropdownOptions(this.#places, this.selectedCity?.id, this.selectedPlan?.id),
      this.venueUrlFallback(),
    );
    this.typedPlace = undefined;
    if (!this.showPlanListFilters && !this.selectedPlace && this.placesDropdownOptions.length === 1) {
      this.selectedPlace = this.placesDropdownOptions[0];
      this.planDropdownOptions = this.#getPlanDropdownOptions();
    }
    this.#updateQueryParams();
  }

  #updatePlanAndPlaceDropdown({ autoPickPlan = true }: { autoPickPlan?: boolean } = {}): void {
    if (this.showPlanListFilters) {
      this.#updatePlanListEventDropdown();
      this.#updatePlacesDropdown();
      return;
    }

    if (this.#areAllPreviousMandatoryFiltersFilled(SearchBarFilter.plan, false)) {
      this.planDropdownOptions = this.#getPlanDropdownOptions();
      if (this.selectedPlan && !this.planDropdownOptions.some(plan => plan.id === this.selectedPlan?.id)) {
        this.selectedPlan = undefined;
      }
      if (autoPickPlan && !this.selectedPlan && this.planDropdownOptions.length === 1) {
        this.selectedPlan = this.planDropdownOptions[0];
      }
    }
    this.#updatePlacesDropdown();
  }

  #updatePlanListEventDropdown(): void {
    this.planDropdownOptions = this.#dropdownService.getPlanDropdownOptions(this.#plans);
    this.typedPlan = undefined;
    if (this.selectedPlan && !this.planDropdownOptions.some(plan => plan.id === this.selectedPlan?.id)) {
      this.selectedPlan = undefined;
    }
  }

  #updatePlansDropdown({ autoPickPlan = true }: { autoPickPlan?: boolean } = {}): void {
    if (!this.#areAllPreviousMandatoryFiltersFilled(SearchBarFilter.plan)) {
      return;
    }
    this.planDropdownOptions = this.#getPlanDropdownOptions();
    this.typedPlan = undefined;
    if (autoPickPlan && this.planDropdownOptions.length === 1) {
      this.selectedPlan = this.planDropdownOptions[0];
      this.#updatePlacesDropdown();
      return;
    } else if (autoPickPlan && this.#meetsCriteriaForPreselectedActivePlan()) {
      const active_plans = this.planDropdownOptions.filter(plan => plan.status == PlanStatus.ON_SALE);
      if (active_plans.length === 1) {
        this.selectedPlan = active_plans[0];
        this.#updatePlacesDropdown();
        return;
      }
    }
    this.selectedPlan = undefined;
    this.selectedPlace = undefined;
    if (this.#areAllPreviousMandatoryFiltersFilled(SearchBarFilter.place)) {
      this.placesDropdownOptions = this.#dropdownService.getPlaceDropdownOptions(this.#places, this.selectedCity?.id);
      if (this.placesDropdownOptions.length === 1) {
        this.selectedPlace = this.placesDropdownOptions[0];
      }
    }
    this.#updateQueryParams();
  }

  #updateQueryParams(): void {
    const hasTypedCityInfo = this.typedCity && this.typedCity !== '';
    const hasTypedPlanInfo = this.typedPlan && this.typedPlan !== '';
    const hasTypedPlaceInfo = this.typedPlace && this.typedPlace !== '';
    const queryParams = {
      // When this search bar does not own the channel filter (`showChannels === false`), omit the
      // `channelId` key entirely so the router's `merge` keeps any existing value (e.g. a deeplinked
      // channel on the channels-settings page). Setting it to `null` would delete the param.
      ...(this.showChannels ? { channelId: this.channelId } : {}),
      cityId:
        !hasTypedCityInfo && this.selectedCity?.id != null && !this.#isSelectAllOption(this.selectedCity)
          ? this.selectedCity.id.toString()
          : null,
      cityName: hasTypedCityInfo ? this.typedCity : null,
      dateFrom: this.selectedRange && this.selectedRange.startDate ? this.#dateService.toISODateFormat(this.selectedRange.startDate) : null,
      dateTo: this.selectedRange && this.selectedRange.endDate ? this.#dateService.toISODateFormat(this.selectedRange.endDate) : null,
      // The store first, the input second: the guard writes the store while the route re-runs, so after a
      // switch the input still names the partner left behind until change detection refreshes it - and
      // any rewrite from here would put that one back in the URL and undo the switch.
      [DISTRIBUTOR_PARTNER_QUERY_PARAM]: this.showDistributorPartnersFilter()
        ? (this.#distributorTarget.target()?.targetOrganizationId?.toString() ?? this.selectedDistributorPartner()?.id?.toString() ?? null)
        : null,
      partnerId: this.showPartners ? this.partnerId?.toString() : null,
      planId: !hasTypedPlanInfo && this.showPlan ? this.selectedPlan?.id.toString() : null,
      planName: hasTypedPlanInfo && this.showPlan ? this.typedPlan : null,
      venueId:
        !hasTypedPlaceInfo && this.showVenue && this.selectedPlace?.id != null && !this.#isSelectAllOption(this.selectedPlace)
          ? this.selectedPlace.id.toString()
          : null,
      venueName: hasTypedPlaceInfo && this.showVenue ? this.typedPlace : null,
      ...(this.showPlanListFilters
        ? {
            kind: this.#getEffectivePlanListKindId() ?? null,
            status: this.selectedPlanListStatus?.id ?? null,
          }
        : {}),
    };
    this.#changeQueryParams(queryParams);
  }

  #updateSelectDate(range: FilterDateRange): void {
    if (this.selectedRange && (this.selectedRange.startDate != range?.startDate || this.selectedRange.endDate != range?.endDate)) {
      this.#isDefaultFilter = false;
    }
    this.selectedRange = range;
    this.#updateQueryParams();
  }

  #updateSelectDateByPlanOrCurrentDays(plan?: SelectDropdownPlanOption): void {
    if (!this.showCalendar || !this.useDefaultDateRange) {
      return;
    }
    this.initialDateRange = (plan && this.#getDateRangeFromPlan(plan)) || this.#getCurrentDaysRange();
    this.#updateSelectDate(this.initialDateRange);
  }

  #getEffectivePlanListKindId(): PlanKind | undefined {
    const kindId = this.selectedPlanListKind?.id;
    if (!kindId || kindId === PlanKind.ALL) {
      return undefined;
    }
    return kindId as PlanKind;
  }

  #getActivePlanKindFilter(): PlanKind[] | undefined {
    if (this.showPlanListFilters) {
      const kindId = this.#getEffectivePlanListKindId();
      return kindId ? [kindId] : undefined;
    }
    return this.planKindFilter;
  }

  #getActivePlanReviewStatusFilter(): PlanReviewRequestStatus[] | undefined {
    if (this.showPlanListFilters) {
      return this.#selectedPlanListReviewStatusOption()?.reviewStatuses;
    }
    return this.planReviewStatusFilter;
  }

  #getActivePlanStatusFilter(): PlanStatus[] | undefined {
    if (this.showPlanListFilters) {
      const selectedReviewStatusOption = this.#selectedPlanListReviewStatusOption();
      if (selectedReviewStatusOption || !this.selectedPlanListStatus) {
        return undefined;
      }
      return [this.selectedPlanListStatus.id as PlanStatus];
    }
    return this.planStatusFilter;
  }

  #handlePlanListContextChange(
    previousCityId: number | null,
    nextCityId: number | null,
    previousPlaceId: number | null,
    nextPlaceId: number | null,
  ): void {
    const cityChanged = previousCityId !== nextCityId;
    const placeChanged = previousPlaceId !== nextPlaceId;

    if (!cityChanged && !placeChanged) {
      return;
    }

    if (cityChanged) {
      this.selectedPlanListKind = null;
      this.selectedPlanListStatus = null;
      this.#cleanPlan(false);
    } else if (placeChanged && nextPlaceId === null) {
      this.selectedPlanListKind = null;
      this.selectedPlanListStatus = null;
    }

    this.#refreshPlanListVisibleFilterOptions({ emitSearch: false });
  }

  #isSelectAllOption(option?: Pick<SelectOption, 'id'> | null): boolean {
    return Number(option?.id) === TypeaheadComponent.selectAllOptionId;
  }

  #syncPlanListPlanDropdown(): void {
    if (this.showPlanListFilters) {
      this.#applyPlanFilters();
      return;
    }
    this.#updatePlansDropdown();
  }

  #initPlanListFilterOptions(): void {
    this.#planListSelectAllLabel = this.#translateService.instant('common.all');
    const kindOptions = buildPlanListKindOptions(this.#translateService, this.#userService, this.#planListSelectAllLabel);
    const statusOptions = buildPlanListStatusOptions(this.#translateService, this.#planListSelectAllLabel);
    this.#planListMasterKindOptions = kindOptions.filter(option => option.id !== PlanKind.ALL);
    this.#planListMasterStatusOptions = statusOptions.filter(option => option.id !== PlanStatus.ALL);
    this.#planListReviewStatusDefinitions = buildPlanListReviewStatusFilterDefinitions(this.#userService);
    this.#planListReviewStatusOptions = buildPlanListReviewStatusOptions(this.#translateService, this.#planListReviewStatusDefinitions);
    this.#planListFiltersInitialized = true;
  }

  #refreshPlanListVisibleFilterOptions(options?: { emitSearch?: boolean }): void {
    if (!this.showPlanListFilters || !this.#planListFiltersInitialized) {
      return;
    }

    const cityVenuePlans = filterListPlansByContext(this.#plansAllKinds, {
      cityId: this.selectedCity?.id ?? null,
      placeId: this.selectedPlace?.id ?? null,
    });
    const availableKindIds = getDistinctPlanKinds(cityVenuePlans);

    this.planListKindOptions = this.#planListMasterKindOptions.filter(option => availableKindIds.includes(option.id as PlanKind));

    let filtersChanged = false;

    if (this.selectedPlanListKind && !this.planListKindOptions.some(option => option.id === this.selectedPlanListKind?.id)) {
      this.selectedPlanListKind = null;
      filtersChanged = true;
    }

    const kindScopedPlans = filterListPlansByContext(cityVenuePlans, {
      kind: this.#getEffectivePlanListKindId(),
    });
    const availableStatusIds = getDistinctPlanStatuses(kindScopedPlans);

    this.planListStatusOptions = [
      ...this.#planListMasterStatusOptions.filter(option => availableStatusIds.includes(option.id as PlanStatus)),
      // TODO: scope via getVisibleReviewStatusFilterIds once /plans returns latest_review
      ...this.#planListReviewStatusOptions,
    ];

    if (this.selectedPlanListStatus && !this.planListStatusOptions.some(option => option.id === this.selectedPlanListStatus?.id)) {
      this.selectedPlanListStatus = null;
      filtersChanged = true;
    }

    this.#applyPlanFilters();

    if (filtersChanged) {
      this.#updateQueryParams();
      if (options?.emitSearch ?? true) {
        this.#emitFilters();
      }
    }
  }

  #selectedPlanListReviewStatusOption(): ReviewStatusFilterDefinition | undefined {
    const selectedId = this.selectedPlanListStatus?.id;
    if (!selectedId) {
      return undefined;
    }
    return this.#planListReviewStatusDefinitions.find(option => option.id === selectedId);
  }

  #validatePlanListFiltersFromQueryParams(): void {
    if (!this.showPlanListFilters || !this.#planListFiltersInitialized || this.#planListFiltersFromUrlValidated) {
      return;
    }

    this.#planListFiltersFromUrlValidated = true;
    const initialKind = this.#route.snapshot.queryParamMap.get('kind');
    const initialStatus = this.#route.snapshot.queryParamMap.get('status');

    if (!initialKind) {
      this.selectedPlanListKind = null;
    } else {
      this.selectedPlanListKind = this.#planListMasterKindOptions.find(option => option.id === initialKind) ?? null;
    }

    if (!initialStatus) {
      this.selectedPlanListStatus = null;
    } else {
      this.selectedPlanListStatus =
        [...this.#planListMasterStatusOptions, ...this.#planListReviewStatusOptions].find(option => option.id === initialStatus) ?? null;
    }

    if (initialKind || initialStatus) {
      this.#isDefaultFilter = false;
    }
  }
}
