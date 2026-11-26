import { HttpErrorResponse, HttpStatusCode } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { CreateVenueResponse, VenueService } from '@fz-original/app/modules/content-plan/services/venue/venue.service';
import { SelectOption } from '@fz-original/app/shared/layout/filters/select/select.interface';
import { City } from '@fz-original/app/shared/models/plan/city.model';
import { Venue } from '@fz-original/app/shared/models/plan/plan-detail.model';
import { CitiesService } from '@fz-original/app/shared/services/city/cities.service';
import { CityMatchingService } from '@fz-original/app/shared/services/city/city-matching.service';
import { PartnerService } from '@fz-original/app/shared/services/partner/partner.service';
import { Observable, of, throwError } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';

import { CreateVenueFailureReason, CreateVenueFromPlaceError } from './create-venue-from-place.error';
import { CreateVenueFromPlaceData } from './create-venue-from-place.model';

const DUPLICATE_VENUE_MESSAGE_FRAGMENT = 'already exists';
const PLACE_ALREADY_EXISTS_ERROR_CODE = 'PLACE_ALREADY_EXISTS';

interface CreateVenueErrorBody {
  data?: {
    place_id?: number;
  };
  error?: {
    code?: string;
    message?: string;
  };
  message?: string;
}

function isCreateVenueErrorBody(body: unknown): body is CreateVenueErrorBody {
  if (typeof body !== 'object' || body === null) {
    return false;
  }

  const record = body as Record<string, unknown>; // index probes only; runtime shape is validated below

  if ('data' in record && record['data'] !== undefined && record['data'] !== null && typeof record['data'] !== 'object') {
    return false;
  }

  if ('error' in record && record['error'] !== undefined && (typeof record['error'] !== 'object' || record['error'] === null)) {
    return false;
  }

  if ('message' in record && record['message'] !== undefined && typeof record['message'] !== 'string') {
    return false;
  }

  const data = record['data'];

  if (data !== null && data !== undefined && typeof data === 'object' && 'place_id' in data) {
    const placeId = (data as { place_id?: unknown }).place_id;

    if (placeId !== undefined && typeof placeId !== 'number') {
      return false;
    }
  }

  const error = record['error'];

  if (error !== undefined && typeof error === 'object' && error !== null) {
    const errorRecord = error as Record<string, unknown>;

    if ('code' in errorRecord && errorRecord['code'] !== undefined && typeof errorRecord['code'] !== 'string') {
      return false;
    }

    if ('message' in errorRecord && errorRecord['message'] !== undefined && typeof errorRecord['message'] !== 'string') {
      return false;
    }
  }

  return true;
}

@Injectable({
  providedIn: 'root',
})
export class CreateVenueFromPlaceService {
  readonly #citiesService = inject(CitiesService);
  readonly #cityMatchingService = inject(CityMatchingService);
  readonly #partnerService = inject(PartnerService);
  readonly #venueService = inject(VenueService);

  create(data: CreateVenueFromPlaceData): Observable<Venue> {
    const partnerId = this.#partnerService.getPartner()?.id;

    if (partnerId === undefined) {
      return throwError(() => new CreateVenueFromPlaceError('unknown'));
    }

    return this.#venueService
      .createVenue(partnerId, {
        city_id: data.cityId,
        google_place_id: data.place.place_id,
        is_public: false,
        type: 'standard',
      })
      .pipe(
        switchMap((response: CreateVenueResponse) => {
          const venueId = 'data' in response ? response.data.place_id : response.id;

          return of(this.#toVenue(venueId, data));
        }),
        catchError((error: unknown) => throwError(() => this.#toCreateVenueError(error))),
      );
  }

  getCityOptions(searchTerm?: string): Observable<SelectOption[]> {
    const partnerId = this.#partnerService.getPartner()?.id;

    if (partnerId === undefined) {
      return of([]);
    }

    return this.#citiesService
      .getCities(partnerId, searchTerm)
      .pipe(map((cities: City[]) => cities.map((city: City) => ({ id: city.id, title: city.name }))));
  }

  resolveCity(placeCity: string, options: SelectOption[]): Observable<SelectOption | null> {
    const matchingOption = this.#cityMatchingService.findInOptions(options, placeCity);

    return matchingOption === null ? this.#cityMatchingService.searchByName(placeCity) : of(matchingOption);
  }

  toVenueFromPlaceData(placeId: number, data: CreateVenueFromPlaceData): Venue {
    return this.#toVenue(placeId, data);
  }

  #getFailureReason(error: HttpErrorResponse): { placeId?: number; reason: CreateVenueFailureReason } {
    const body = this.#parseErrorBody(error.error);
    const conflictPlaceId = this.#extractPlaceId(body);

    if (error.status === HttpStatusCode.Conflict) {
      if (conflictPlaceId !== undefined || body?.error?.code === PLACE_ALREADY_EXISTS_ERROR_CODE) {
        return { placeId: conflictPlaceId, reason: 'duplicate' };
      }

      return { reason: 'unknown' };
    }

    if (error.status !== HttpStatusCode.BadRequest) {
      return { reason: 'unknown' };
    }

    return this.#serializeBody(error.error).toLowerCase().includes(DUPLICATE_VENUE_MESSAGE_FRAGMENT)
      ? { placeId: conflictPlaceId, reason: 'duplicate' }
      : { reason: 'unknown' };
  }

  #extractPlaceId(body: CreateVenueErrorBody | undefined): number | undefined {
    const placeId = body?.data?.place_id;

    if (placeId === undefined || Number.isNaN(Number(placeId))) {
      return undefined;
    }

    return Number(placeId);
  }

  #parseErrorBody(body: unknown): CreateVenueErrorBody | undefined {
    return isCreateVenueErrorBody(body) ? body : undefined;
  }

  #serializeBody(body: unknown): string {
    if (typeof body === 'string') {
      return body;
    }

    const serialized: string | undefined = JSON.stringify(body);

    return serialized ?? '';
  }

  #toCreateVenueError(error: unknown): CreateVenueFromPlaceError {
    if (error instanceof CreateVenueFromPlaceError) {
      return error;
    }

    if (error instanceof HttpErrorResponse) {
      const failure = this.#getFailureReason(error);

      return new CreateVenueFromPlaceError(failure.reason, failure.placeId);
    }

    return new CreateVenueFromPlaceError('unknown');
  }

  #toVenue(id: number, data: CreateVenueFromPlaceData): Venue {
    return {
      address: data.place.address,
      cityName: data.cityName,
      country: data.place.country ?? undefined,
      googlePlaceId: data.place.place_id,
      id,
      isPublic: false,
      latitude: data.place.latitude,
      longitude: data.place.longitude,
      name: data.place.name,
      region: data.place.region ?? undefined,
      type: 'standard',
      zipCode: data.place.zip_code ?? undefined,
    };
  }
}
