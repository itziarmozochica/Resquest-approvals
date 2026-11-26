import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import {
  AddressLookupInformation,
  AddressLookupInformationResponse,
  AddressLookupSuggestion,
  AddressLookupSuggestionResponse,
} from '@fz-original/app/shared/booking-questions/models';
import { BaseResponse } from '@fz-original/app/shared/models/base-response';
import { PartnerService } from '@fz-original/app/shared/services/partner/partner.service';
import { map, Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class AddressLookupService {
  #http = inject(HttpClient);
  #partnerService = inject(PartnerService);

  getAddress(addressId: string): Observable<AddressLookupInformation> {
    const url = `${environment.apiBaseUrl}/3.0/partners/${this.#partnerService.getPartner()?.id}/address_providers/lookup/address/`;
    const params = new HttpParams().set('address_identifier', addressId);
    return this.#http.get<BaseResponse<AddressLookupInformationResponse>>(url, { params }).pipe(
      map(
        response =>
          ({
            id: response.data?.id,
            address: response.data?.address,
            zipCode: response.data?.zipcode,
          }) as AddressLookupInformation,
      ),
    );
  }

  getSuggestions(address: string, containerId: string | null = null): Observable<AddressLookupSuggestion[]> {
    const url = `${environment.apiBaseUrl}/3.0/partners/${this.#partnerService.getPartner()?.id}/address_providers/lookup/suggestions/`;
    let params = new HttpParams().set('search_text', address);
    if (containerId) {
      params = params.set('container_id', containerId);
    }
    return this.#http.get<BaseResponse<AddressLookupSuggestionResponse[]>>(url, { params }).pipe(
      map(
        response =>
          response.data?.map(
            item =>
              ({
                id: item.address_identifier,
                address: item.suggestion,
                type: item.type ?? 'address',
              }) satisfies AddressLookupSuggestion,
          ) || [],
      ),
    );
  }
}
