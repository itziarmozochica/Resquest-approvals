import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { Observable } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

import { environment } from '../../../../environments/environment';
import { BaseResponse } from '../../models/base-response';
import { Outage, OutageDto } from '../../models/outage/outage.model';
import { ErrorResponseUtils } from '../../utils/error-response.utils';
import { PartnerService } from '../partner/partner.service';
import { OutageAdapter } from './adapters/outage.adapter';

@Injectable({
  providedIn: 'root',
})
export class OutageService {
  #http = inject(HttpClient);
  #outageAdapter = inject(OutageAdapter);
  #partnerService = inject(PartnerService);

  getOutages(): Observable<BaseResponse<Outage[] | null>> {
    const path: string = this.#getOutagesURL();
    const params: HttpParams = this.#getOutagesParameters();
    return this.#http.get<BaseResponse<OutageDto[]>>(path, { params }).pipe(
      map((result: BaseResponse<OutageDto[]>) => this.#outageAdapter.fromApi(result)),
      catchError(error => ErrorResponseUtils.getErrorResponse<Outage[]>(error)),
    );
  }

  #getOutagesParameters(): HttpParams {
    let params = new HttpParams();
    params = params.set('ongoing', true);
    return params;
  }

  #getOutagesURL(): string {
    const partnerId = this.#partnerService.getPartner()?.id;
    return `${environment.apiGWBaseUrl}/1.0/partners/${partnerId}/outages`;
  }
}
