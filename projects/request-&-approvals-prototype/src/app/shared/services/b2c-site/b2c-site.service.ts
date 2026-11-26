import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { BehaviorSubject, Observable, of } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';

import { environment } from '../../../../environments/environment';
import { B2CSiteConfiguration } from '../../../modules/resellers/models/b2c-site-configuration.model';
import { ConcessionDto } from '../../../modules/resellers/services/dtos/concession.dto';
import { BaseResponse } from '../../models/base-response';
import { ErrorResponseUtils } from '../../utils/error-response.utils';
import { B2cSiteConfigurationsAdapter } from './b2c-site-configurations.adapter';

export const B2C_SITE_QUERY_PARAM = 'c';

@Injectable({
  providedIn: 'root',
})
export class B2cSiteService {
  #b2cSiteConfiguration: B2CSiteConfiguration | null = null;
  #b2cSiteConfigurationAdapter = inject(B2cSiteConfigurationsAdapter);
  #b2cSiteConfigurationSelected$ = new BehaviorSubject<B2CSiteConfiguration | null>(this.#getB2cSiteConfigurationSelected());
  #http = inject(HttpClient);

  get(): BehaviorSubject<B2CSiteConfiguration | null> {
    return this.#b2cSiteConfigurationSelected$;
  }

  getB2cSiteConfigurations(
    resellerId: number,
    affiliateId?: number,
    includeAffiliateCatalogViewUrl?: boolean,
    cityStandardId?: number,
  ): Observable<BaseResponse<Array<B2CSiteConfiguration>> | BaseResponse<string[]> | BaseResponse<null>> {
    const path: string = this.#getB2cSiteConfigurationsUrl(resellerId);
    const params = this.#getB2cSiteConfigurationsParams(affiliateId, includeAffiliateCatalogViewUrl, cityStandardId);

    return this.#http.get<BaseResponse<ConcessionDto[]>>(path, { observe: 'response', params }).pipe(
      switchMap(result => {
        return of(this.#b2cSiteConfigurationAdapter.fromApi(result));
      }),
      catchError(error => ErrorResponseUtils.getErrorResponse<string[]>(error)),
    );
  }

  select(b2cSiteConfiguration: B2CSiteConfiguration): void {
    this.#b2cSiteConfiguration = b2cSiteConfiguration;
    this.#b2cSiteConfigurationSelected$.next(b2cSiteConfiguration);
  }

  #getB2cSiteConfigurationSelected(): B2CSiteConfiguration | null {
    return this.#b2cSiteConfiguration;
  }

  #getB2cSiteConfigurationsUrl(resellerId: number): string {
    return `${environment.apiB2cSiteBaseUrl}/resellers/${resellerId}/configurations/`;
  }

  #getB2cSiteConfigurationsParams(
    affiliateId?: number,
    includeAffiliateCatalogViewUrl?: boolean,
    cityStandardId?: number,
  ): { [key: string]: number | boolean | string } {
    return Object.fromEntries(
      [
        ['affiliate_id', affiliateId],
        ['include_affiliate_catalog_view_url', includeAffiliateCatalogViewUrl],
        ['city_standard_id', cityStandardId],
      ].filter(([, value]) => value !== undefined && value !== null),
    );
  }
}
