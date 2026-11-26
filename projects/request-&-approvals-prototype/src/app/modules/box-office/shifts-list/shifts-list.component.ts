import { Component, computed, inject, OnDestroy, OnInit, signal, WritableSignal } from '@angular/core';
import { ActivatedRoute, NavigationExtras, Params, Router } from '@angular/router';

import { TranslateService } from '@ngx-translate/core';
import moment from 'moment-timezone';
import { EMPTY, merge, Observable, ReplaySubject, Subject, zip } from 'rxjs';
import { catchError, debounceTime, finalize, map, switchMap, take, takeUntil, tap } from 'rxjs/operators';

import { SearchShiftsEvent } from '../../../core/tracking/core/events/search-shifts';
import { ScreenTypeaheadInput } from '../../../core/tracking/core/events/select-option-typeahead';
import { TrackingService } from '../../../core/tracking/tracking.service';
import { FilterDateRange } from '../../../shared/layout/filters/date-range/date-range.interface';
import { SelectOption } from '../../../shared/layout/filters/select/select.interface';
import { SearchBarFilter } from '../../../shared/search-bar/enums/search-bar-filter.enum';
import { SearchFilter } from '../../../shared/search-bar/models/search-filter.model';
import { UserService } from '../../../shared/services/user/user.service';
import { DateUtil } from '../../../shared/utils/date.util';
import { removeEmptyKeys } from '../../../shared/utils/object.utils';
import { trackById } from '../../../shared/utils/track-by';
import { ShiftListQuery } from '../shared/models/shift-list-query';
import { Shift, ShiftStatus } from '../shared/models/shifts.model';
import { CashRegistersService } from '../shared/services/cash-registers/cash-registers.service';
import { OnsiteSetupsService } from '../shared/services/onsite-setups/onsite-setups.service';
import { ShiftListStorageService } from './services/shared/shift-list-storage.service';
import {
  ShiftListAbstractFactoryService,
  ShiftListProvider,
} from './services/shift-list-abstract-factory/shift-list-abstract-factory.service';

export enum State {
  noFiltersSelected = 'noFilterSelected',
  noResults = 'noResults',
  withResults = 'withResults',
  error = 'error',
}

interface SearchQuery extends ShiftListQuery {
  placeId?: number;
}

@Component({
  selector: 'app-shifts-list',
  standalone: false,
  templateUrl: './shifts-list.component.html',
  styleUrls: ['./shifts-list.component.scss'],
})
export class ShiftsListComponent implements OnDestroy, OnInit {
  static readonly itemsPerPage = 20;

  readonly #userService = inject(UserService);
  readonly #onsiteSetupsService = inject(OnsiteSetupsService);
  readonly #cashRegistersService = inject(CashRegistersService);
  readonly #shiftListStorageService = inject(ShiftListStorageService);

  screen = ScreenTypeaheadInput;
  mandatoryFilters: SearchBarFilter[] = [SearchBarFilter.city, SearchBarFilter.place];
  queryDateRange: FilterDateRange | null = null;

  placeId: number | null = null;
  hasMandandatoryFilters = false;
  shifts: Shift[] = [];
  trackById = trackById;
  stateEnum = State;
  currentState = State.noFiltersSelected;
  isLoading = false;
  lastQuery: SearchQuery | null = null;
  hasMorePages = false;
  timezoneSubject = new ReplaySubject<string>(1);
  statusOptions: SelectOption[] = [];
  lastStatus: SelectOption | null = null;

  canViewAllShifts = this.#userService.hasPermission('can_view_shifts');

  showCashRegisterColumn: WritableSignal<boolean> = signal(false);
  showOnsiteSetupColumn: WritableSignal<boolean> = signal(false);

  onsiteSetupOptions: SelectOption[] = [];
  cashRegisterOptions: SelectOption[] = [];
  selectedOnsiteSetup: SelectOption | undefined;
  selectedCashRegister: SelectOption | undefined;

  private cityName: string | null = null;
  private cityId: number | null = null;
  placeName = '';

  readonly #destroy$ = new Subject<void>();
  private shiftRequestIndex = 0;
  private shiftListService: ShiftListProvider;

  readonly #page = signal(1);
  readonly #pageRequests = new Subject<number>();
  protected readonly hasPreviousPage = computed(() => this.#page() > 1);

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private trackingService: TrackingService,
    private translate: TranslateService,
    shiftListFactory: ShiftListAbstractFactoryService,
  ) {
    this.shiftListService = shiftListFactory.getProvider();

    const searchQuery = this.timezoneSubject.pipe(switchMap(timezone => this.getSearchQueryFromUrl(timezone)));

    merge(searchQuery)
      .pipe(
        debounceTime(250),
        tap(query => {
          this.resetSearch();
          this.lastQuery = query;
          this.lastStatus = this.getLastStatus();
          this.hasMandandatoryFilters = this.hasMandatoryQueryParams(query);
          if (this.hasMandandatoryFilters) {
            this.currentState = State.withResults;
          } else {
            this.queryDateRange = null;
          }
          if (this.hasMandandatoryFilters) {
            this.#pageRequests.next(1);
          }
        }),
        takeUntil(this.#destroy$),
      )
      .subscribe();

    this.#pageRequests
      .pipe(
        switchMap(page => this.#getShiftPageRequest({ ...this.lastQuery, page, itemsPerPage: ShiftsListComponent.itemsPerPage })),
        takeUntil(this.#destroy$),
      )
      .subscribe();
  }

  ngOnInit(): void {
    this.getStatusOptions();
    this.#loadCheckboxPreferences();
  }

  ngOnDestroy(): void {
    this.#destroy$.next();
  }

  getLastStatus(): SelectOption | null {
    return this.getStatusOption(this.lastQuery?.status || '');
  }

  loadNewSearch(filters: SearchFilter): void {
    if (filters.selectedPlace?.id) {
      this.placeId = filters.selectedPlace.id;
    }
    if (filters.selectedPlace?.title) {
      this.placeName = filters.selectedPlace.title;
    }
    this.cityName = filters.selectedCity?.title ?? null;
    this.cityId = filters.selectedCity?.id ?? null;
    this.timezoneSubject.next(filters.selectedCity?.timezone ?? '');

    this.selectedOnsiteSetup = undefined;
    this.selectedCashRegister = undefined;

    this.loadFilterOptions();
  }

  selectDate(event: FilterDateRange): void {
    const query: SearchQuery = {
      createdAtFrom: event?.startDate || undefined,
      createdAtTo: event?.endDate || undefined,
      status: this.lastQuery?.status || undefined,
      ...this.#getSelectedFilterIds(),
    };
    this.changeSearchParams(query);
  }

  private getStatusOptions(): void {
    for (const status in ShiftStatus) {
      const statusKey = status as keyof typeof ShiftStatus;
      this.statusOptions.push({
        id: ShiftStatus[statusKey],
        title: this.translate.instant('shiftStatus.' + ShiftStatus[statusKey]),
      });
    }
  }

  getStatusOption(id: string): SelectOption | null {
    for (const option of this.statusOptions) {
      if (option.id === id) {
        return option;
      }
    }
    return null;
  }

  selectStatus(event: SelectOption): void {
    let status: ShiftStatus | undefined;
    if (event) {
      status = event.id;
    }
    const queryParams = this.route.snapshot.queryParams;
    const query: SearchQuery = {
      status: status,
      createdAtFrom: queryParams.createdAtFrom ? new Date(queryParams.createdAtFrom) : undefined,
      createdAtTo: queryParams.createdAtTo ? new Date(queryParams.createdAtTo) : undefined,
      ...this.#getSelectedFilterIds(),
    };
    this.changeSearchParams(query);
  }

  selectOnsiteSetup(event: SelectOption): void {
    this.selectedOnsiteSetup = event;
    this.#updateFilters();
  }

  selectCashRegister(event: SelectOption): void {
    this.selectedCashRegister = event;
    this.#updateFilters();
  }

  onShowOnsiteSetupColumnChange(show: boolean): void {
    this.showOnsiteSetupColumn.set(show);
    this.#saveCheckboxPreferences();
    if (!show) {
      this.selectedOnsiteSetup = undefined;
      this.#updateFilters();
    }
  }

  onShowCashRegisterColumnChange(show: boolean): void {
    this.showCashRegisterColumn.set(show);
    this.#saveCheckboxPreferences();
    if (!show) {
      this.selectedCashRegister = undefined;
      this.#updateFilters();
    }
  }

  #updateFilters(): void {
    if (!this.canViewAllShifts) return;

    const queryParams = this.route.snapshot.queryParams;
    const query: SearchQuery = {
      status: this.lastQuery?.status,
      createdAtFrom: queryParams.createdAtFrom ? new Date(queryParams.createdAtFrom) : undefined,
      createdAtTo: queryParams.createdAtTo ? new Date(queryParams.createdAtTo) : undefined,
      ...this.#getSelectedFilterIds(),
    };
    this.changeSearchParams(query);
  }

  protected onNextPage(): void {
    this.#pageRequests.next(this.#page() + 1);
  }

  protected onPreviousPage(): void {
    this.#pageRequests.next(this.#page() - 1);
  }

  async viewShift(shiftId: string): Promise<void> {
    const selectedShift = this.shifts.find(shift => shift.id === shiftId);
    const timezone = await this.timezoneSubject.pipe(take(1)).toPromise();

    const navigationExtras: NavigationExtras = {
      queryParams: { placeId: this.placeId },
      state: {
        shift: selectedShift,
        timezone,
      },
    };
    this.router.navigate(['/box-office/shift/', shiftId], navigationExtras);
  }

  #getShiftPageRequest({ placeId, ...query }: SearchQuery): Observable<boolean> {
    if (!placeId) {
      return EMPTY;
    }
    const requestIndex = ++this.shiftRequestIndex;
    this.currentState = State.withResults;
    this.isLoading = true;

    return this.shiftListService.getShiftList(placeId, query).pipe(
      catchError(() => {
        this.currentState = State.error;
        return EMPTY;
      }),
      tap(response => {
        if (query.page === 1) {
          this.sendMixpanelSearchShiftsEvent();
        }
        this.shifts = response.data || [];
        this.#page.set(query.page ?? 1);
        this.currentState = this.shifts.length === 0 ? State.noResults : State.withResults;
      }),
      finalize(() => {
        if (requestIndex === this.shiftRequestIndex) {
          this.isLoading = false;
        }
      }),
      map(response => {
        this.hasMorePages = Boolean(response.getNextPaginationPage());
        return this.hasMorePages;
      }),
    );
  }

  private async sendMixpanelSearchShiftsEvent(): Promise<void> {
    const timezone = await this.timezoneSubject.pipe(take(1)).toPromise();

    this.trackingService.track(
      new SearchShiftsEvent({
        created_at_from:
          this.lastQuery?.createdAtFrom && timezone ? this.formatToUTC(this.lastQuery.createdAtFrom.toISOString(), timezone) : null,
        created_at_to:
          this.lastQuery?.createdAtTo && timezone ? this.formatToUTC(this.lastQuery.createdAtTo.toISOString(), timezone) : null,
        city_id: this.cityId || 0,
        city_name: this.cityName || '',
        place_id: this.placeId || 0,
        place_name: this.placeName,
        status: this.lastQuery?.status ? this.lastQuery.status : null,
      }),
    );
  }

  private formatToUTC(date: string, timezone: string): string {
    return moment(date).tz(timezone).utc().format('YYYY-MM-DDTHH:mm');
  }

  private changeSearchParams(filters: SearchQuery): void {
    const queryParams = this.filtersToQueryParams(filters);
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams,
      queryParamsHandling: 'merge',
    });
  }

  private getSearchQueryFromUrl(timezone: string): Observable<SearchQuery> {
    return this.route.queryParams.pipe(
      tap(({ createdAtFrom, createdAtTo }) => {
        this.queryDateRange = {
          startDate: (createdAtFrom && new Date(createdAtFrom)) ?? null,
          endDate: (createdAtTo && new Date(createdAtTo)) ?? null,
        };
      }),
      map(({ venueId, createdAtFrom, createdAtTo, status, cashRegisterId, onsiteSetupId }) =>
        removeEmptyKeys({
          placeId: venueId,
          createdAtFrom: createdAtFrom && DateUtil.prepareDate(createdAtFrom, timezone),
          createdAtTo: createdAtTo && DateUtil.prepareEndDate(createdAtTo, timezone),
          status: status,
          ...(this.canViewAllShifts &&
            cashRegisterId && {
              cashRegisterId: cashRegisterId,
            }),
          ...(this.canViewAllShifts &&
            onsiteSetupId && {
              onsiteSetupId: onsiteSetupId,
            }),
        }),
      ),
    );
  }

  private filtersToQueryParams(filters: SearchQuery) {
    return {
      createdAtTo: filters.createdAtTo?.toISOString() ?? null,
      createdAtFrom: filters.createdAtFrom?.toISOString() ?? null,
      status: filters.status ?? null,
      ...(this.canViewAllShifts && {
        cashRegisterId: filters.cashRegisterId ?? null,
        onsiteSetupId: filters.onsiteSetupId ?? null,
      }),
    };
  }

  private hasMandatoryQueryParams(query: SearchQuery): boolean {
    return Boolean(query.placeId);
  }

  private loadFilterOptions(): void {
    if (!this.canViewAllShifts || !this.placeId) return;

    zip(
      this.#onsiteSetupsService.getOnsiteSetups({ placeId: this.placeId }),
      this.#cashRegistersService.getCashRegisters(undefined, this.placeId),
    )
      .pipe(takeUntil(this.#destroy$))
      .subscribe({
        next: ([onsiteSetups, cashRegisters]) => {
          this.onsiteSetupOptions = onsiteSetups.map(setup => ({
            id: setup.id,
            title: setup.name,
          }));

          this.cashRegisterOptions = cashRegisters.map(cashRegister => ({
            id: cashRegister.id,
            title: cashRegister.name,
          }));

          this.#syncDropdownsWithUrl();
        },
        error: () => {
          this.onsiteSetupOptions = [];
          this.cashRegisterOptions = [];
        },
      });
  }

  private resetSearch() {
    this.hasMorePages = false;
    this.hasMandandatoryFilters = false;
    this.currentState = State.noFiltersSelected;
    this.shifts = [];
  }

  #loadCheckboxPreferences(): void {
    const preferences = this.#shiftListStorageService.getShiftListPreferences();
    if (preferences) {
      this.showOnsiteSetupColumn.set(Boolean(preferences.showOnsiteSetupColumn));
      this.showCashRegisterColumn.set(Boolean(preferences.showCashRegisterColumn));
    }
  }

  #saveCheckboxPreferences(): void {
    this.#shiftListStorageService.setShiftListPreferences({
      showOnsiteSetupColumn: this.showOnsiteSetupColumn(),
      showCashRegisterColumn: this.showCashRegisterColumn(),
    });
  }

  #getSelectedFilterIds(): { cashRegisterId?: string; onsiteSetupId?: string } {
    if (!this.canViewAllShifts) {
      return {};
    }

    return {
      cashRegisterId: this.selectedCashRegister?.id?.toString(),
      onsiteSetupId: this.selectedOnsiteSetup?.id?.toString(),
    };
  }

  #syncDropdownsWithUrl(): void {
    if (!this.canViewAllShifts) return;

    const params: Params = this.route.snapshot.queryParams;
    const paramsToRemove: string[] = [];

    if (params.cashRegisterId != null) {
      const cashRegisterOption: SelectOption | undefined = this.cashRegisterOptions.find(option => option.id === params.cashRegisterId);
      if (cashRegisterOption) {
        this.selectedCashRegister = cashRegisterOption;
        this.showCashRegisterColumn.set(true);
      } else {
        paramsToRemove.push('cashRegisterId');
      }
    }

    if (params.onsiteSetupId != null) {
      const onsiteSetupOption: SelectOption | undefined = this.onsiteSetupOptions.find(option => option.id === params.onsiteSetupId);
      if (onsiteSetupOption) {
        this.selectedOnsiteSetup = onsiteSetupOption;
        this.showOnsiteSetupColumn.set(true);
      } else {
        paramsToRemove.push('onsiteSetupId');
      }
    }

    if (paramsToRemove.length > 0) {
      const cleanParams: Params = { ...params };
      paramsToRemove.forEach(param => delete cleanParams[param]);

      this.router.navigate([], {
        relativeTo: this.route,
        queryParams: cleanParams,
        replaceUrl: true,
      });
    }
  }
}
