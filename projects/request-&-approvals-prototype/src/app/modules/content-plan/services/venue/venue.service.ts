import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { BaseResponse } from '@fz-original/app/shared/models/base-response';
import { Venue, VenueDTO } from '@fz-original/app/shared/models/plan/plan-detail.model';
import { environment } from '@fz-original/environments/environment';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface PlaceUpdateResponse {
  address: string;
  city: {
    currency: string;
    id: number;
    name: string;
    timezone: string;
  };
  id: number;
  name: string;
  zip_code: string;
}

export interface CreateVenueRequest {
  city_id: number;
  google_place_id?: string;
  is_public?: boolean;
  type: string;
}

export type CreateVenueResponse = { id: number } | { data: { place_id: number } };

export interface UpdateVenueRequest {
  city_id: number;
  google_place_id: string;
}

export type getVenueResponse = Omit<BaseResponse<{ places: VenueDTO[]; total_count: number }>, 'getError'>;

export interface PaginatedVenuesResult {
  totalCount: number;
  venues: Venue[];
}

@Injectable({
  providedIn: 'root',
})
export class VenueService {
  #http = inject(HttpClient);

  createVenue(partnerId: number, venueData: CreateVenueRequest): Observable<CreateVenueResponse> {
    const path: string = this.#getCreatePlacesUrl(partnerId);
    return this.#http.post<CreateVenueResponse>(path, venueData);
  }

  deleteVenue(partnerId: number, venueId: number): Observable<void> {
    const path = this.#getVenueByIdUrl(partnerId, venueId);
    return this.#http.delete<void>(path);
  }

  getVenueById(partnerId: number, venueId: number): Observable<PlaceUpdateResponse> {
    const path: string = this.#getVenueByIdUrl(partnerId, venueId);
    return this.#http.get<PlaceUpdateResponse>(path);
  }

  getVenues(
    partnerId: number,
    currency?: string,
    page: number = 1,
    pageSize: number = 20,
    searchTerm?: string,
    onlyOwned: boolean = false,
    cityId?: number,
    isDraftMode: boolean = false,
  ): Observable<Venue[]> {
    return this.getVenuesPaginated(partnerId, currency, page, pageSize, searchTerm, onlyOwned, cityId, isDraftMode).pipe(
      map(result => result.venues),
    );
  }

  getPartnerVenuesPaginated(partnerId: number, page: number, pageSize: number, searchTerm?: string): Observable<PaginatedVenuesResult> {
    return this.#fetchVenuesPaginated(partnerId, undefined, page, pageSize, searchTerm, false, undefined, false, true);
  }

  getVenuesPaginated(
    partnerId: number,
    currency?: string,
    page: number = 1,
    pageSize: number = 20,
    searchTerm?: string,
    onlyOwned: boolean = false,
    cityId?: number,
    isDraftMode: boolean = false,
  ): Observable<PaginatedVenuesResult> {
    return this.#fetchVenuesPaginated(partnerId, currency, page, pageSize, searchTerm, onlyOwned, cityId, isDraftMode, false);
  }

  #fetchVenuesPaginated(
    partnerId: number,
    currency: string | undefined,
    page: number,
    pageSize: number,
    searchTerm: string | undefined,
    onlyOwned: boolean,
    cityId: number | undefined,
    isDraftMode: boolean,
    onlyPartnerVenues: boolean,
  ): Observable<PaginatedVenuesResult> {
    const path: string = this.#getPlacesUrl(partnerId);

    const paramsObject: { [key: string]: string } = {
      page: page.toString(),
      page_size: pageSize.toString(),
    };

    if (currency) {
      paramsObject.currency = currency;
    }

    if (searchTerm) {
      paramsObject.search_term = searchTerm;
    }

    if (onlyOwned) {
      paramsObject.only_owned = 'true';
    }

    if (onlyPartnerVenues) {
      paramsObject.only_partner_venues = 'true';
    }

    if (!isDraftMode && cityId) {
      paramsObject.city_id = cityId.toString();
    }

    const params = new HttpParams({ fromObject: paramsObject });

    return this.#http.get<getVenueResponse>(path, { params }).pipe(
      map(response => {
        const venues =
          response.data?.places.map((venueDTO: VenueDTO) => ({
            id: venueDTO.id,
            name: venueDTO.name,
            timezone: venueDTO.timezone,
            latitude: venueDTO.latitude,
            longitude: venueDTO.longitude,
            address: venueDTO.address,
            cityName: venueDTO.city_name,
            googlePlaceId: venueDTO.google_place_id,
            isPublic: venueDTO.is_public,
            zipCode: venueDTO.zip_code,
            type: venueDTO.type,
          })) || [];

        return {
          venues,
          totalCount: response.data?.total_count ?? 0,
        };
      }),
    );
  }

  updateVenue(partnerId: number, planId: number, venues: Venue[]): Observable<unknown> {
    const path: string = this.#getUpdatePlacesUrl(partnerId, planId);
    return this.#http.put<PlaceUpdateResponse>(
      path,
      venues.map(venue => ({
        place_id: venue.id,
        is_hidden: venue.isSecret,
      })),
    );
  }

  updateVenueById(partnerId: number, venueId: number, venueData: UpdateVenueRequest): Observable<PlaceUpdateResponse> {
    const path: string = this.#getVenueByIdUrl(partnerId, venueId);
    return this.#http.put<PlaceUpdateResponse>(path, venueData);
  }

  #getCreatePlacesUrl(partnerId: number): string {
    return `${environment.apiGWBaseUrl}/1.0/partners/${partnerId.toString()}/places/`;
  }

  #getPlacesUrl(partnerId: number): string {
    return `${environment.apiBaseUrl}/partners/${partnerId.toString()}/places/`;
  }

  #getUpdatePlacesUrl(partnerId: number, planId: number): string {
    return `${environment.apiGWBaseUrl}/1.0/partners/${partnerId.toString()}/plans/${planId.toString()}/places`;
  }

  #getVenueByIdUrl(partnerId: number, venueId: number): string {
    return `${environment.apiBaseUrl}/3.0/partners/${partnerId.toString()}/places/${venueId.toString()}/`;
  }
}
