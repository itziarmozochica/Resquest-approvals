export interface GoogleMapsPlaceResult {
  address_components?: GooglePlaceAddressComponent[];
  formatted_address?: string;
  geometry?: {
    location?: {
      lat(): number;
      lng(): number;
    };
  };
  name?: string;
  place_id?: string;
  vicinity?: string;
}

export interface GooglePlaceAddressComponent {
  long_name: string;
  short_name: string;
  types: string[];
}

export interface AutocompleteOptions {
  fields?: string[];
  types?: string[];
}

export type GooglePlacesSearchType = 'address' | 'establishment' | 'geocode';

export interface AutocompleteInstance {
  addListener(event: string, callback: () => void): void;

  getPlace(): GoogleMapsPlaceResult;
}

export interface GooglePlace {
  address: string;
  city: string | null;
  country: string | null;
  latitude: number;
  longitude: number;
  name: string;
  place_id: string;
  province?: string | null;
  region: string | null;
  zip_code: string | null;
}

export interface GoogleMapsEvent {
  clearInstanceListeners(instance: AutocompleteInstance): void;
}

export interface GoogleMapsPlaces {
  Autocomplete: new (input: HTMLInputElement, options: AutocompleteOptions) => AutocompleteInstance;
}

export interface GoogleMapsNamespace {
  event: GoogleMapsEvent;
  places: GoogleMapsPlaces;
}

export interface WindowWithGoogle extends Window {
  google?: {
    maps: GoogleMapsNamespace;
  };
}
