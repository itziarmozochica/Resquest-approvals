import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { BaseResponse } from '@fz-original/app/shared/models/base-response';
import { City, CityData } from '@fz-original/app/shared/models/plan/city.model';
import { environment } from '@fz-original/environments/environment';
import { Observable } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

import { ErrorResponseUtils } from '../../utils/error-response.utils';
import { Permissions } from '../user/permissions';
import { UserService } from '../user/user.service';

export type GetCitiesResponse = Omit<BaseResponse<{ cities: CityData[]; total_count: number }>, 'getError'>;
export type GetCitiesByChannelIdResponse = BaseResponse<{ cities: CityData[] }>;

export interface PaginatedCitiesResult {
  cities: City[];
  totalCount: number;
}

@Injectable({
  providedIn: 'root',
})
export class CitiesService {
  #http = inject(HttpClient);
  #userService = inject(UserService);

  getCities(partnerId: number, searchTerm?: string): Observable<City[]> {
    return this.#fetchPartnerCities(partnerId, { searchTerm }).pipe(map(result => result.cities));
  }

  getCitiesPaginated(partnerId: number, page: number = 1, pageSize: number = 20, searchTerm?: string): Observable<PaginatedCitiesResult> {
    return this.#fetchPartnerCities(partnerId, { searchTerm, page, pageSize });
  }

  #fetchPartnerCities(
    partnerId: number,
    options: { searchTerm?: string; page?: number; pageSize?: number },
  ): Observable<PaginatedCitiesResult> {
    const url = this.#getCitiesUrl(partnerId);

    const paramsRecord: Record<string, string> = {};
    if (options.searchTerm) {
      paramsRecord.search_term = options.searchTerm;
    }
    if (options.page !== undefined && options.pageSize !== undefined) {
      paramsRecord.page = options.page.toString();
      paramsRecord.page_size = options.pageSize.toString();
    }

    const params = new HttpParams({ fromObject: paramsRecord });

    return this.#http.get<GetCitiesResponse>(url, { params }).pipe(
      map(response => ({
        cities: response.data?.cities.map(cityData => this.#cityFromData(cityData)) ?? [],
        totalCount: response.data?.total_count ?? 0,
      })),
    );
  }

  #cityFromData(cityData: CityData): City {
    return new City(cityData.id, cityData.name, cityData.timezone, cityData.standard_id, cityData.currency, cityData.country);
  }

  getCitiesByChannelId(
    partnerOrResellerId: number,
    channelId?: string,
    page?: number,
    itemsPerPage?: number,
  ): Observable<BaseResponse<City[] | null>> {
    const url = this.#getCitiesByChannelIdUrl(partnerOrResellerId);

    let params = new HttpParams();
    if (channelId) {
      params = params.set('channel_id', channelId);
    }
    if (page !== undefined) {
      params = params.set('page', page.toString());
    }
    if (itemsPerPage !== undefined) {
      params = params.set('items_per_page', itemsPerPage.toString());
    }

    return this.#http.get<GetCitiesByChannelIdResponse>(url, { params }).pipe(
      map(response => {
        if (!response.data) {
          return new BaseResponse<null>(null, response.error);
        }

        const cities = response.data.cities.map(
          cityData => new City(cityData.id, cityData.name, cityData.timezone, cityData.standard_id, cityData.currency),
        );
        return new BaseResponse<City[]>(cities, response.error);
      }),
      catchError(error => ErrorResponseUtils.getErrorResponse(error)),
    );
  }

  getCityById(partnerId: number, cityId: number): Observable<BaseResponse<CityData>> {
    const url = this.#getCityByIdUrl(partnerId, cityId);
    return this.#http.get<BaseResponse<CityData>>(url);
  }

  #getCitiesByChannelIdUrl(partnerOrResellerId: number): string {
    const userCanReserveOnBehalf = this.#userService.hasPermission(Permissions.CAN_RESERVE_ON_BEHALF);
    if (userCanReserveOnBehalf) {
      return `${environment.apiGWBaseUrl}/1.0/partners/${partnerOrResellerId}/cities`;
    }

    return `${environment.apiGWBaseUrl}/1.0/resellers/${partnerOrResellerId}/cities`;
  }

  #getCitiesUrl(partnerId: number): string {
    return `${environment.apiBaseUrl}/3.0/partners/${partnerId}/cities/`;
  }

  #getCityByIdUrl(partnerId: number, cityId: number): string {
    return `${environment.apiGWBaseUrl}/1.0/partners/${partnerId}/cities/${cityId}`;
  }
}
