import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  effect,
  ElementRef,
  EventEmitter,
  inject,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  SimpleChanges,
  ViewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { GooglePlace } from '@fz-original/app/modules/content-plan/models/google-places.model';
import { GooglePlacesAutocompleteService } from '@fz-original/app/modules/content-plan/services/google-places/google-places-autocomplete.service';
import { TranslateModule } from '@ngx-translate/core';
import { Subscription } from 'rxjs';

import { type IrVenueFormGroup } from '../../models/ir-answers-form.util';
import { ProductTaxRateOption, VenuePricingService } from '../../services/venue-pricing.service';

export interface VenueAnswer {
  placeId?: string | null;
  name?: string | null;
  address?: string | null;
  city?: string | null;
  region?: string | null;
  country?: string | null;
  zipCode?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  currency?: string | null;
  mustUseTaxBase?: boolean;
  productTaxRates?: ProductTaxRateOption[];
}

@Component({
  selector: 'app-ir-venue-answer',
  templateUrl: './ir-venue-answer.component.html',
  styleUrls: ['./ir-venue-answer.component.scss'],
  imports: [CommonModule, TranslateModule],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IrVenueAnswerComponent implements OnChanges, AfterViewInit, OnDestroy {
  @Input({ required: true }) testId!: string;
  @Input() form: IrVenueFormGroup | null = null;
  @Input() value: VenueAnswer | null = null;
  @Input() readOnly = false;
  @Input() partnerId: number | null = null;

  @Output() valueChange = new EventEmitter<VenueAnswer>();

  @ViewChild('searchInput') searchInput?: ElementRef<HTMLInputElement>;

  readonly #places = inject(GooglePlacesAutocompleteService);
  readonly #cdr = inject(ChangeDetectorRef);
  readonly #venuePricing = inject(VenuePricingService);
  readonly #destroyRef = inject(DestroyRef);

  model: VenueAnswer = {};
  scriptReady = false;
  placesUnavailable = false;

  #disabledGuard?: MutationObserver;
  #formValueChangesSubscription?: Subscription;
  #pricedPlaceId: string | null = null;

  constructor() {
    effect(() => {
      this.scriptReady = this.#places.isScriptReady();
      this.placesUnavailable = !!this.#places.scriptLoadError();
      this.#cdr.markForCheck();
      if (this.scriptReady) {
        queueMicrotask(() => this.#bindAutocomplete());
      }
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['form'] && this.form) {
      this.#formValueChangesSubscription?.unsubscribe();
      this.#syncModelFromForm();
      this.#formValueChangesSubscription = this.form.valueChanges.pipe(takeUntilDestroyed(this.#destroyRef)).subscribe(() => {
        this.#syncModelFromForm();
        this.#maybeFetchVenuePricing();
        this.#cdr.markForCheck();
      });
    } else if (changes['value']) {
      this.model = { ...(this.value ?? {}) };
    }
    // Also resolve pricing for a venue that was already chosen/restored (not just freshly picked from Google).
    this.#maybeFetchVenuePricing();
  }

  ngAfterViewInit(): void {
    this.#places.loadGoogleMapsScript();
    if (this.scriptReady) {
      this.#bindAutocomplete();
    }
  }

  ngOnDestroy(): void {
    this.#formValueChangesSubscription?.unsubscribe();
    this.#teardownAutocomplete();
  }

  onFieldChange<K extends keyof VenueAnswer>(field: K, raw: string): void {
    this.model = { ...this.model, [field]: raw === '' ? null : (raw as VenueAnswer[K]) };
    this.#writeField(field, raw === '' ? null : raw);
    this.valueChange.emit(this.model);
  }

  #bindAutocomplete(): void {
    const input = this.searchInput?.nativeElement;
    if (!input || this.readOnly) {
      return;
    }
    try {
      this.#places.initializeAutocomplete(input, place => this.#applyPlace(place));
    } catch {
      this.placesUnavailable = true;
      this.#cdr.markForCheck();
    } finally {
      // The legacy Google Places widget can flip `disabled` on the bound input when a
      // request is rejected, leaving the search box greyed out and frozen. readOnly is
      // the only legitimate reason to disable it, so keep it in sync and watch for any
      // stray disabling coming from Google's own JS.
      input.disabled = this.readOnly;
      this.#guardSearchInput(input);
    }
  }

  #guardSearchInput(input: HTMLInputElement): void {
    this.#disabledGuard?.disconnect();
    this.#disabledGuard = new MutationObserver(() => {
      if (input.disabled && !this.readOnly) {
        input.disabled = false;
      }
    });
    this.#disabledGuard.observe(input, { attributes: true, attributeFilter: ['disabled'] });
  }

  #teardownAutocomplete(): void {
    this.#disabledGuard?.disconnect();
    this.#disabledGuard = undefined;
    const input = this.searchInput?.nativeElement;
    if (input) {
      this.#places.cleanupAutocomplete(input);
    }
  }

  #applyPlace(place: GooglePlace): void {
    this.model = {
      placeId: place.place_id || null,
      name: place.name || null,
      address: place.address || null,
      city: place.city,
      region: place.region,
      country: place.country,
      zipCode: place.zip_code,
      latitude: place.latitude || null,
      longitude: place.longitude || null,
    };
    // Clear the previous venue's pricing so a failed re-fetch can't leave a stale currency/tax mix.
    this.#patchForm({ ...this.model, currency: null, mustUseTaxBase: null, productTaxRates: null });
    this.valueChange.emit(this.model);
    this.#cdr.markForCheck();
    // Force re-resolution for an explicit pick (the model was just rebuilt without pricing); the service caches.
    this.#pricedPlaceId = null;
    this.#maybeFetchVenuePricing();
  }

  #maybeFetchVenuePricing(): void {
    const placeId = this.model.placeId?.trim();
    if (!placeId || this.partnerId === null || placeId === this.#pricedPlaceId) {
      return;
    }
    this.#pricedPlaceId = placeId;
    // Skip the call when the answer already carries pricing for this place (e.g. restored from the backend).
    if (this.model.productTaxRates != null) {
      return;
    }
    this.#fetchVenuePricing(this.partnerId, placeId);
  }

  #fetchVenuePricing(partnerId: number, placeId: string): void {
    this.#venuePricing
      .getByGooglePlaceId(partnerId, placeId)
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe(pricing => {
        // Ignore a stale response if the user picked another venue meanwhile.
        if (this.model.placeId !== placeId) {
          return;
        }
        if (pricing === null) {
          // Failed fetch: don't persist empty pricing; clear the guard so a later change retries.
          this.#pricedPlaceId = null;
          return;
        }
        this.model = {
          ...this.model,
          currency: pricing.currency,
          mustUseTaxBase: pricing.mustUseTaxBase,
          productTaxRates: pricing.productTaxRates,
        };
        this.#patchForm({
          currency: pricing.currency,
          mustUseTaxBase: pricing.mustUseTaxBase,
          productTaxRates: pricing.productTaxRates,
        });
        this.valueChange.emit(this.model);
        this.#cdr.markForCheck();
      });
  }

  #syncModelFromForm(): void {
    this.model = { ...(this.form?.getRawValue() ?? {}) } as VenueAnswer;
  }

  #writeField(field: keyof VenueAnswer, value: unknown): void {
    const control = this.form?.controls[field];
    if (!control) {
      return;
    }
    control.setValue(value);
    control.markAsDirty();
    this.form?.markAsDirty();
  }

  #patchForm(value: Partial<Record<keyof VenueAnswer, unknown>>): void {
    if (!this.form) {
      return;
    }
    Object.entries(value).forEach(([key, fieldValue]) => {
      const control = this.form?.controls[key];
      if (control) {
        control.setValue(fieldValue);
        control.markAsDirty();
      }
    });
    this.form.markAsDirty();
  }
}
