import { computed, Injectable, Signal, signal, WritableSignal } from '@angular/core';

import { environment } from '../../../../../environments/environment';
import {
  AutocompleteInstance,
  AutocompleteOptions,
  GoogleMapsNamespace,
  GoogleMapsPlaceResult,
  GooglePlace,
  GooglePlaceAddressComponent,
  GooglePlacesSearchType,
  WindowWithGoogle,
} from '../../models/google-places.model';

@Injectable({
  providedIn: 'root',
})
export class GooglePlacesAutocompleteService {
  static readonly defaultSearchTypes: GooglePlacesSearchType[] = ['establishment'];
  static readonly maxPollAttempts = 50;
  static readonly pollIntervalMs = 100;

  #autocompleteInstances = new WeakMap<HTMLInputElement, AutocompleteInstance>();
  #isScriptLoaded: WritableSignal<boolean> = signal<boolean>(false);
  #isScriptLoading: WritableSignal<boolean> = signal<boolean>(false);
  #scriptLoadError: WritableSignal<string | null> = signal<string | null>(null);

  isScriptReady: Signal<boolean> = this.#isScriptLoaded.asReadonly();
  isScriptUnavailable: Signal<boolean> = computed(() => this.#scriptLoadError() !== null);
  scriptLoadError: Signal<string | null> = this.#scriptLoadError.asReadonly();

  cleanupAutocomplete(inputElement: HTMLInputElement): void {
    if (!inputElement) {
      return;
    }

    const autocomplete = this.#autocompleteInstances.get(inputElement);
    if (!autocomplete) {
      return;
    }

    const googleMaps = this.#getGoogleMapsNamespace();
    if (googleMaps?.event) {
      googleMaps.event.clearInstanceListeners(autocomplete);
    }

    this.#autocompleteInstances.delete(inputElement);
  }

  initializeAutocomplete(
    inputElement: HTMLInputElement,
    onPlaceSelected: (place: GooglePlace) => void,
    searchTypes: GooglePlacesSearchType[] = GooglePlacesAutocompleteService.defaultSearchTypes,
  ): void {
    if (!this.#isGoogleMapsAvailable()) {
      return;
    }

    this.cleanupAutocomplete(inputElement);

    const autocomplete = this.#createAutocompleteInstance(inputElement, searchTypes);
    this.#autocompleteInstances.set(inputElement, autocomplete);
    this.#setupPlaceChangedListener(autocomplete, onPlaceSelected);
  }

  loadGoogleMapsScript(): void {
    if (this.#isScriptLoaded() || this.#isScriptLoading()) {
      return;
    }

    if (this.#isGoogleMapsAvailable()) {
      this.#isScriptLoaded.set(true);
      return;
    }

    if (!environment.googlePlacesApiKey) {
      this.#scriptLoadError.set('Google Maps API key is not configured');
      return;
    }

    this.#isScriptLoading.set(true);
    this.#scriptLoadError.set(null);
    this.#appendScriptTag();
  }

  #appendScriptTag(): void {
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${environment.googlePlacesApiKey}&libraries=places&loading=async`;
    script.async = true;
    script.defer = true;

    script.onload = () => {
      this.#pollForGoogleMapsReady(0);
    };

    script.onerror = () => {
      this.#isScriptLoading.set(false);
      this.#scriptLoadError.set('Failed to load Google Maps script');
    };

    document.head.appendChild(script);
  }

  #createAutocompleteInstance(inputElement: HTMLInputElement, searchTypes: GooglePlacesSearchType[]): AutocompleteInstance {
    const googleMaps = this.#getGoogleMapsNamespace();
    if (!googleMaps) {
      throw new Error('Google Maps namespace is not available');
    }

    const options: AutocompleteOptions = {
      types: [...searchTypes],
      fields: ['geometry', 'name', 'address_components', 'vicinity', 'place_id', 'formatted_address'],
    };

    return new googleMaps.places.Autocomplete(inputElement, options);
  }

  #extractAddressComponent(components: GooglePlaceAddressComponent[], type: string, useShortName: boolean = false): string | null {
    const component = components.find((c: GooglePlaceAddressComponent) => c.types.includes(type));
    if (!component) {
      return null;
    }
    return useShortName ? component.short_name : component.long_name;
  }

  #getGoogleMapsNamespace(): GoogleMapsNamespace | null {
    const windowWithGoogle = window as unknown as WindowWithGoogle;
    return windowWithGoogle.google?.maps ?? null;
  }

  #isGoogleMapsAvailable(): boolean {
    const googleMaps = this.#getGoogleMapsNamespace();
    return Boolean(googleMaps?.places);
  }

  #parsePlaceResult(place: GoogleMapsPlaceResult): GooglePlace {
    const addressComponents = place.address_components ?? [];
    const geometry = place.geometry;

    const zipCode = this.#extractAddressComponent(addressComponents, 'postal_code');
    const city = this.#extractAddressComponent(addressComponents, 'locality');
    const country = this.#extractAddressComponent(addressComponents, 'country', true);
    const region = this.#extractAddressComponent(addressComponents, 'administrative_area_level_1', true);
    const province = this.#extractAddressComponent(addressComponents, 'administrative_area_level_1');

    const address = place.formatted_address ?? place.vicinity ?? '';

    return {
      place_id: place.place_id ?? '',
      name: place.name ?? '',
      address,
      latitude: geometry?.location?.lat() ?? 0,
      longitude: geometry?.location?.lng() ?? 0,
      zip_code: zipCode,
      city,
      country,
      region,
      province,
    };
  }

  #pollForGoogleMapsReady(attempts: number): void {
    if (this.#isGoogleMapsAvailable()) {
      this.#isScriptLoaded.set(true);
      this.#isScriptLoading.set(false);
      return;
    }

    if (attempts >= GooglePlacesAutocompleteService.maxPollAttempts) {
      this.#isScriptLoading.set(false);
      this.#scriptLoadError.set('Google Maps Places API not available after script load');
      return;
    }

    setTimeout(() => {
      this.#pollForGoogleMapsReady(attempts + 1);
    }, GooglePlacesAutocompleteService.pollIntervalMs);
  }

  #setupPlaceChangedListener(autocomplete: AutocompleteInstance, onPlaceSelected: (place: GooglePlace) => void): void {
    autocomplete.addListener('place_changed', () => {
      const place = autocomplete.getPlace();
      if (place.place_id) {
        const googlePlace = this.#parsePlaceResult(place);
        onPlaceSelected(googlePlace);
      }
    });
  }
}
