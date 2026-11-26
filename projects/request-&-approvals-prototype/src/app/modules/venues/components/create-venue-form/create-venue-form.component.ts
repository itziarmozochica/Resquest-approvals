import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  input,
  OnDestroy,
  output,
  signal,
  untracked,
  viewChild,
  WritableSignal,
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { GooglePlace } from '@fz-original/app/modules/content-plan/models/google-places.model';
import { GooglePlacesAutocompleteService } from '@fz-original/app/modules/content-plan/services/google-places/google-places-autocomplete.service';
import { createVenuePlaceSelected } from '@fz-original/app/modules/plan/tracking/events/create-venue-place-selected.event';
import { createVenueVenueCreated } from '@fz-original/app/modules/plan/tracking/events/create-venue-venue-created.event';
import { IgntTypeaheadModule } from '@fz-original/app/shared/layout/filters/ignt-typeahead/ignt-typeahead.module';
import { SelectOption } from '@fz-original/app/shared/layout/filters/select/select.interface';
import { Venue } from '@fz-original/app/shared/models/plan/plan-detail.model';
import { FzTrackingService } from '@fz/fz-tracking/src/public-api';
import { IgntAlertComponent, IgntButtonComponent } from '@ignite/common';
import { IgntInputFieldComponent } from '@ignite/legacy/components/ignt-input-field/ignt-input-field.component';
import { IngtFormError } from '@ignite/legacy/models/ignt-input.model';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { of, startWith, Subject, tap } from 'rxjs';
import { catchError, filter, finalize, switchMap } from 'rxjs/operators';

import { CreateVenueFromPlaceError } from '../../services/create-venue-from-place/create-venue-from-place.error';
import { CreateVenueFormVariant, CreateVenueFromPlaceData } from '../../services/create-venue-from-place/create-venue-from-place.model';
import { CreateVenueFromPlaceService } from '../../services/create-venue-from-place/create-venue-from-place.service';

const cityNotSupportedErrorType = 'cityNotSupported';
const DUPLICATE_VENUE_ERROR_TYPE = 'venueAlreadyExists';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IgntAlertComponent, IgntButtonComponent, IgntInputFieldComponent, IgntTypeaheadModule, ReactiveFormsModule, TranslateModule],
  selector: 'app-create-venue-form',
  standalone: true,
  styleUrl: './create-venue-form.component.scss',
  templateUrl: './create-venue-form.component.html',
})
export class CreateVenueFormComponent implements AfterViewInit, OnDestroy {
  readonly #createVenueFromPlaceService = inject(CreateVenueFromPlaceService);
  readonly #destroyRef = inject(DestroyRef);
  readonly #formBuilder = inject(FormBuilder);
  readonly #fzTracking = inject(FzTrackingService);
  readonly #googlePlacesAutocompleteService = inject(GooglePlacesAutocompleteService);
  readonly #googlePlacesInput: WritableSignal<HTMLInputElement | null> = signal<HTMLInputElement | null>(null);
  readonly #placeSelected$ = new Subject<GooglePlace>();
  readonly #translateService = inject(TranslateService);

  protected readonly partnersSupportEmail = 'partners@example.com';
  protected readonly cityOptions = signal<SelectOption[]>([]);
  protected readonly errorMessageKey = signal<string | null>(null);
  protected readonly isCityNotSupported = signal(false);
  protected readonly googlePlaceIdErrors = signal<IngtFormError[]>([]);
  protected readonly googlePlaceSearchErrors = signal<IngtFormError[]>([]);
  readonly #duplicateVenuePlaceId = signal<number | undefined>(undefined);
  protected readonly hasDuplicateVenue = signal(false);
  protected readonly canSelectExistingDuplicateVenue = computed(() => this.#duplicateVenuePlaceId() !== undefined);
  readonly #pendingCreateData = signal<CreateVenueFromPlaceData | null>(null);
  protected readonly form = this.#formBuilder.group({
    address: [{ disabled: true, value: '' }, Validators.required],
    googlePlaceId: ['', Validators.required],
    googlePlaceSearch: [''],
    latitude: [{ disabled: true, value: '' }, Validators.required],
    longitude: [{ disabled: true, value: '' }, Validators.required],
    name: [{ disabled: true, value: '' }, Validators.required],
    zipCode: [{ disabled: true, value: '' }, Validators.required],
  });
  readonly #formStatus = toSignal(this.form.statusChanges.pipe(startWith(this.form.status)));
  protected readonly isSaving = signal(false);
  protected readonly googlePlacesSearch = viewChild<IgntInputFieldComponent>('googlePlacesSearch');
  protected readonly selectedCity = signal<SelectOption | undefined>(undefined);
  protected readonly selectedPlace = signal<GooglePlace | null>(null);
  protected readonly isSubmitDisabled = computed(() => {
    const city = this.selectedCity();
    const place = this.selectedPlace();

    const isCityInvalid = !city || typeof city.id !== 'number' || Number.isNaN(city.id);

    return this.#formStatus() !== 'VALID' || this.isSaving() || isCityInvalid || place === null;
  });

  readonly variant = input<CreateVenueFormVariant>('advanced');
  readonly cancelled = output<void>();
  readonly createFailed = output<void>();
  readonly formChanged = output<void>();
  readonly savingChange = output<boolean>();
  readonly existingVenueSelected = output<Venue>();
  readonly venueCreated = output<Venue>();

  constructor() {
    this.#googlePlacesAutocompleteService.loadGoogleMapsScript();
    this.#loadCities();

    effect(() => {
      const isReady = this.#googlePlacesAutocompleteService.isScriptReady();
      const inputElement = this.#googlePlacesInput();

      if (isReady && inputElement) {
        untracked(() => {
          this.#googlePlacesAutocompleteService.initializeAutocomplete(inputElement, (place: GooglePlace) => {
            this.#onGooglePlaceSelected(place);
          });
        });
      }
    });

    effect(() => {
      if (this.#googlePlacesAutocompleteService.scriptLoadError() !== null) {
        this.errorMessageKey.set('venues.createModal.googlePlacesLoadError');
      }
    });

    effect(() => {
      this.savingChange.emit(this.isSaving());
    });

    this.form.controls.googlePlaceId.valueChanges.pipe(takeUntilDestroyed(this.#destroyRef)).subscribe(() => {
      this.#clearDuplicateVenueError();
      this.formChanged.emit();
    });

    this.#placeSelected$
      .pipe(
        switchMap((place: GooglePlace) => {
          this.selectedCity.set(undefined);
          this.#clearCityNotSupportedError();

          const placeCity = place.city;
          if (placeCity === null || placeCity.length === 0) {
            this.#showCityNotSupportedError(placeCity ?? '');
            this.#trackPlaceSelected(place, false);
            return of(null);
          }

          return this.#createVenueFromPlaceService.resolveCity(placeCity, this.cityOptions()).pipe(
            tap((city: SelectOption | null) => {
              const mappingSucceeded = city !== null;
              if (!mappingSucceeded) {
                this.#showCityNotSupportedError(placeCity);
              }
              this.#trackPlaceSelected(place, mappingSucceeded);
            }),
            catchError(() => {
              this.errorMessageKey.set('venues.createModal.cityResolveError');
              this.#trackPlaceSelected(place, false);
              return of(null);
            }),
          );
        }),
        filter((city): city is SelectOption => city !== null),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe((city: SelectOption) => {
        if (!this.cityOptions().some((option: SelectOption) => option.id === city.id)) {
          this.cityOptions.update((options: SelectOption[]) => [...options, city]);
        }
        this.selectedCity.set(city);
      });

    this.#destroyRef.onDestroy(() => this.#cleanupAutocomplete());
  }

  ngAfterViewInit(): void {
    this.#syncGooglePlacesInput();
  }

  ngOnDestroy(): void {
    this.#cleanupAutocomplete();
    const inputElement = this.#googlePlacesInput();

    if (inputElement) {
      inputElement.value = '';
      this.form.controls.googlePlaceSearch.reset('');
      this.#googlePlacesInput.set(null);
    }

    this.#placeSelected$.complete();
  }

  protected onCancel(): void {
    if (!this.isSaving()) {
      this.cancelled.emit();
    }
  }

  protected onFormChanged(): void {
    this.formChanged.emit();
  }

  protected onDuplicateVenueDismissed(): void {
    this.#clearDuplicateVenueError();
  }

  protected onSubmit(): void {
    const city = this.selectedCity();
    const place = this.selectedPlace();
    const rawFormValues = this.form.getRawValue();

    if (this.isSubmitDisabled() || city === undefined || place === null || typeof city.id !== 'number') {
      this.form.markAllAsTouched();
      return;
    }

    const createData: CreateVenueFromPlaceData = {
      cityId: city.id,
      cityName: city.title,
      place: {
        ...place,
        place_id: rawFormValues.googlePlaceId ?? place.place_id,
      },
    };
    this.#pendingCreateData.set(createData);

    this.isSaving.set(true);
    this.errorMessageKey.set(null);
    this.#clearDuplicateVenueError();
    this.#createVenueFromPlaceService
      .create(createData)
      .pipe(
        finalize(() => this.isSaving.set(false)),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe({
        error: (error: unknown) => {
          if (error instanceof CreateVenueFromPlaceError && error.reason === 'duplicate') {
            this.#duplicateVenuePlaceId.set(error.placeId);
            this.#showDuplicateVenueError();
            return;
          }

          this.createFailed.emit();
        },
        next: (venue: Venue) => {
          this.#trackVenueCreated(venue);
          this.venueCreated.emit(venue);
        },
      });
  }

  protected onUseExistingVenue(): void {
    const createData = this.#pendingCreateData();
    const placeId = this.#duplicateVenuePlaceId();

    if (createData !== null && placeId !== undefined) {
      const venue = this.#createVenueFromPlaceService.toVenueFromPlaceData(placeId, createData);
      this.#clearDuplicateVenueError();
      this.existingVenueSelected.emit(venue);
      return;
    }

    this.cancelled.emit();
  }

  #cleanupAutocomplete(): void {
    const inputElement = this.#googlePlacesInput();

    if (inputElement) {
      this.#googlePlacesAutocompleteService.cleanupAutocomplete(inputElement);
    }
  }

  #clearCityNotSupportedError(): void {
    if (!this.isCityNotSupported()) {
      return;
    }

    this.isCityNotSupported.set(false);
    this.googlePlaceSearchErrors.set([]);
    this.form.controls.googlePlaceSearch.setErrors(null);
  }

  #clearDuplicateVenueError(): void {
    if (!this.hasDuplicateVenue()) {
      return;
    }

    this.#duplicateVenuePlaceId.set(undefined);
    this.hasDuplicateVenue.set(false);
    this.googlePlaceIdErrors.set([]);
    this.form.controls.googlePlaceId.updateValueAndValidity();
  }

  #loadCities(): void {
    this.#createVenueFromPlaceService
      .getCityOptions()
      .pipe(
        catchError(() => of([])),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe((options: SelectOption[]) => {
        this.cityOptions.set(options);
      });
  }

  #syncGooglePlacesInput(): void {
    const inputElement = this.googlePlacesSearch()?.inputElement.nativeElement;

    if (inputElement instanceof HTMLInputElement) {
      this.#googlePlacesInput.set(inputElement);
    }
  }

  #onGooglePlaceSelected(place: GooglePlace): void {
    this.selectedPlace.set(place);
    this.selectedCity.set(undefined);
    this.errorMessageKey.set(null);
    this.#clearCityNotSupportedError();
    this.form.patchValue({
      address: place.address,
      googlePlaceId: place.place_id,
      latitude: String(place.latitude),
      longitude: String(place.longitude),
      name: place.name,
      zipCode: place.zip_code ?? '',
    });
    this.form.markAllAsTouched();

    this.#placeSelected$.next(place);
  }

  #showCityNotSupportedError(cityName: string): void {
    this.isCityNotSupported.set(true);
    this.googlePlaceSearchErrors.set([
      {
        message:
          cityName.length === 0
            ? this.#translateService.instant('venues.createModal.unsupportedCityUnknown')
            : this.#translateService.instant('venues.createModal.unsupportedCity', { city: cityName }),
        type: cityNotSupportedErrorType,
      },
    ]);
    this.form.controls.googlePlaceSearch.setErrors({ [cityNotSupportedErrorType]: true });
  }

  #showDuplicateVenueError(): void {
    this.hasDuplicateVenue.set(true);
    this.googlePlaceIdErrors.set([
      { message: this.#translateService.instant('venues.createModal.duplicate.fieldError'), type: DUPLICATE_VENUE_ERROR_TYPE },
    ]);
    this.form.controls.googlePlaceId.setErrors({ [DUPLICATE_VENUE_ERROR_TYPE]: true });
  }

  #trackPlaceSelected(place: GooglePlace, mapping: boolean): void {
    this.#fzTracking.track(
      createVenuePlaceSelected({
        creationFlow: this.variant(),
        mapping,
        placeAddress: place.address,
        placeCity: place.city,
        placeCountry: place.country,
        placeGooglePlaceId: place.place_id,
        placeLatitude: place.latitude,
        placeLongitude: place.longitude,
        placeName: place.name,
        placeRegion: place.region,
        placeZipCode: place.zip_code,
      }),
    );
  }

  #trackVenueCreated(venue: Venue): void {
    this.#fzTracking.track(
      createVenueVenueCreated({
        creationFlow: this.variant(),
        venueAddress: venue.address,
        venueCityName: venue.cityName,
        venueGooglePlaceId: venue.googlePlaceId,
        venueId: venue.id!, // #toVenue always sets id on successful create
        venueLatitude: venue.latitude,
        venueLongitude: venue.longitude,
        venueName: venue.name,
        venueZipCode: venue.zipCode,
      }),
    );
  }
}
