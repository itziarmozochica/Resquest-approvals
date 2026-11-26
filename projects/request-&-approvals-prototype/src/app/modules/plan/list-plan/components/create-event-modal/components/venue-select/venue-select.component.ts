import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  input,
  OnDestroy,
  output,
  Signal,
  signal,
  WritableSignal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { PaginatedVenuesResult, VenueService } from '@fz-original/app/modules/content-plan/services/venue/venue.service';
import { IgntTypeaheadModule } from '@fz-original/app/shared/layout/filters/ignt-typeahead/ignt-typeahead.module';
import { SelectOptionTypeaheadInput } from '@fz-original/app/shared/layout/filters/select/select-option-typeahead.enum';
import { SelectOption } from '@fz-original/app/shared/layout/filters/select/select.interface';
import { Venue } from '@fz-original/app/shared/models/plan/plan-detail.model';
import { PartnerService } from '@fz-original/app/shared/services/partner/partner.service';
import { Permissions } from '@fz-original/app/shared/services/user/permissions';
import { UserService } from '@fz-original/app/shared/services/user/user.service';
import { TranslateModule } from '@ngx-translate/core';
import { EMPTY, merge, Subject } from 'rxjs';
import { catchError, debounceTime, exhaustMap, finalize, map, startWith, switchMap, tap } from 'rxjs/operators';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IgntTypeaheadModule, TranslateModule],
  selector: 'app-venue-select',
  standalone: true,
  styleUrl: './venue-select.component.scss',
  templateUrl: './venue-select.component.html',
})
export class VenueSelectComponent implements OnDestroy {
  static readonly loadingOptionId = -999;

  readonly #destroyRef = inject(DestroyRef);
  readonly #partnerService = inject(PartnerService);
  readonly #userService = inject(UserService);
  readonly #venueService = inject(VenueService);

  readonly #hasVenueCreationPermission = this.#userService.hasPermission(Permissions.CAN_CREATE_VENUES);
  #cleanTrigger$ = new Subject<void>();
  #currentPage = 1;
  #loadMore$ = new Subject<void>();
  #refreshTimeoutId: ReturnType<typeof setTimeout> | null = null;
  #refreshTrigger$ = new Subject<void>();
  #typeAheadInteraction$ = new Subject<string>();
  #isInitialVenueLoad = true;
  #venueOptions: WritableSignal<SelectOption[]> = signal([]);
  #venuesPageSize = 20;
  #venuesTotalCount = 0;

  allowCreateVenue = input(false);
  protected readonly canCreateVenue = computed(() => this.allowCreateVenue() && this.#hasVenueCreationPermission);
  cleanTrigger$ = this.#cleanTrigger$.asObservable();
  createVenue = output<void>();
  hasMoreVenues: WritableSignal<boolean> = signal(false);
  isLoading: WritableSignal<boolean> = signal(false);
  isLoadingMore: WritableSignal<boolean> = signal(false);
  refreshTrigger$ = this.#refreshTrigger$.asObservable();
  fieldLabelKey = input('createEvent.venuePlaceholder');
  emptyLabelKey = input('');
  hideLabel = input(false);
  required = input(true);
  searchTerm: WritableSignal<string> = signal('');
  selectedVenueOption: WritableSignal<SelectOption | undefined> = signal(undefined);
  selectOptionTypeaheadInput = SelectOptionTypeaheadInput;
  venueChange = output<Venue | null>();
  #venuesById = new Map<number, Venue>();
  venueOptions: Signal<SelectOption[]> = computed(() => {
    const options = this.#venueOptions();

    if (this.isLoadingMore() && this.hasMoreVenues()) {
      return [
        ...options,
        {
          id: VenueSelectComponent.loadingOptionId,
          isLoadingOption: true,
          title: '',
        },
      ];
    }

    return options;
  });

  constructor() {
    this.#typeAheadInteraction$
      .pipe(
        startWith(''),
        debounceTime(100),
        tap(term => {
          this.searchTerm.set(term);
          this.#resetPagination();
          this.#venueOptions.set([]);
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
            this.#venueService.getVenuesPaginated(partner.id, undefined, 1, this.#venuesPageSize, this.searchTerm()).pipe(
              map(result => ({ isLoadMore: false as const, result })),
              catchError(() => EMPTY),
              finalize(() => this.isLoading.set(false)),
            ),
            this.#loadMore$.pipe(
              exhaustMap(() => {
                if (!this.hasMoreVenues()) {
                  return EMPTY;
                }

                this.isLoadingMore.set(true);
                const nextPage = this.#currentPage + 1;

                return this.#venueService.getVenuesPaginated(partner.id, undefined, nextPage, this.#venuesPageSize, this.searchTerm()).pipe(
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
          this.#appendVenueOptions(result);
          this.#scheduleRefresh(0);
        } else {
          this.#replaceVenueOptions(result);
          this.#syncSelectedVenueOption();
          if (!this.#isInitialVenueLoad) {
            this.#scheduleRefresh(10);
          }
          this.#isInitialVenueLoad = false;
        }
      });
  }

  ngOnDestroy(): void {
    this.#clearRefreshTimeout();
    this.#cleanTrigger$.complete();
    this.#loadMore$.complete();
    this.#refreshTrigger$.complete();
    this.#typeAheadInteraction$.complete();
  }

  onCreateVenue(): void {
    this.createVenue.emit();
  }

  onVenueScrollToEnd(): void {
    if (!this.hasMoreVenues() || this.isLoading() || this.isLoadingMore()) {
      return;
    }

    this.#loadMore$.next();
  }

  onVenueSearch(term: string): void {
    this.#typeAheadInteraction$.next(term.trim());
  }

  onVenueTypeaheadSelected(option: SelectOption | undefined): void {
    if (!option || option.id === VenueSelectComponent.loadingOptionId) {
      this.selectedVenueOption.set(undefined);
      this.venueChange.emit(null);
      return;
    }

    const numericValue = typeof option.id === 'string' ? Number(option.id) : option.id;
    const venueId = Number.isNaN(numericValue) ? null : numericValue;

    this.selectedVenueOption.set(option);
    this.venueChange.emit(venueId === null ? null : (this.#venuesById.get(venueId) ?? null));
  }

  reset(): void {
    this.selectedVenueOption.set(undefined);
    this.#cleanTrigger$.next();
    this.venueChange.emit(null);
    this.#isInitialVenueLoad = true;
    this.#typeAheadInteraction$.next('');
  }

  selectVenue(venue: Venue): void {
    if (venue.id === undefined) {
      return;
    }

    this.#venuesById.set(venue.id, venue);
    const option = this.#mapVenueToOption({ ...venue, id: venue.id });
    this.#venueOptions.update((options: SelectOption[]) => [
      option,
      ...options.filter((currentOption: SelectOption) => currentOption.id !== option.id),
    ]);
    this.selectedVenueOption.set(option);
    this.venueChange.emit(venue);
  }

  #cacheVenues(venues: Venue[]): void {
    venues.forEach(venue => {
      if (venue.id !== undefined) {
        this.#venuesById.set(venue.id, venue);
      }
    });
  }

  #appendVenueOptions(result: PaginatedVenuesResult): void {
    this.#cacheVenues(result.venues);
    const newOptions = this.#mapPlacesToVenueOptions(result.venues);
    const currentOptions = this.#venueOptions();
    const existingIds = new Set(currentOptions.map(option => option.id));
    const uniqueNewOptions = newOptions.filter(option => !existingIds.has(option.id));

    this.#venueOptions.set([...currentOptions, ...uniqueNewOptions]);
    this.#venuesTotalCount = result.totalCount;
    this.#currentPage += 1;
    this.#updateHasMoreVenues();
  }

  #clearRefreshTimeout(): void {
    if (this.#refreshTimeoutId !== null) {
      clearTimeout(this.#refreshTimeoutId);
      this.#refreshTimeoutId = null;
    }
  }

  #mapPlacesToVenueOptions(places: Venue[]): SelectOption[] {
    const seen = new Set<number>();

    return places
      .filter((place): place is Venue & { id: number } => {
        if (place.id === undefined) {
          return false;
        }

        if (seen.has(place.id)) {
          return false;
        }

        seen.add(place.id);
        return true;
      })
      .map((place: Venue & { id: number }) => this.#mapVenueToOption(place));
  }

  #mapVenueToOption(venue: Venue & { id: number }): SelectOption {
    return {
      id: venue.id,
      title: venue.address ? `${venue.name} - ${venue.address}` : venue.name,
    };
  }

  #replaceVenueOptions(result: PaginatedVenuesResult): void {
    this.#cacheVenues(result.venues);
    this.#venueOptions.set(this.#mapPlacesToVenueOptions(result.venues));
    this.#venuesTotalCount = result.totalCount;
    this.#currentPage = 1;
    this.#updateHasMoreVenues();
  }

  #resetPagination(): void {
    this.#currentPage = 1;
    this.#venuesTotalCount = 0;
    this.hasMoreVenues.set(false);
    this.isLoadingMore.set(false);
  }

  #scheduleRefresh(delayMs: number): void {
    this.#clearRefreshTimeout();
    this.#refreshTimeoutId = setTimeout(() => {
      this.#refreshTrigger$.next();
      this.#refreshTimeoutId = null;
    }, delayMs);
  }

  #syncSelectedVenueOption(): void {
    const selectedOption = this.selectedVenueOption();

    if (!selectedOption?.id) {
      return;
    }

    const matchingOption = this.venueOptions().find(option => option.id === selectedOption.id);

    if (matchingOption) {
      this.selectedVenueOption.set(matchingOption);
    }
  }

  #updateHasMoreVenues(): void {
    const loadedCount = this.#venueOptions().length;
    this.hasMoreVenues.set(loadedCount < this.#venuesTotalCount);
  }
}
