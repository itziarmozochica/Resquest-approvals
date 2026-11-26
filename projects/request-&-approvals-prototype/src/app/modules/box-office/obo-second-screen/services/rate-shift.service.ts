import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';

import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { environment } from '../../../../../environments/environment';
import { PartnerService } from '../../../../shared/services/partner/partner.service';
import { ErrorResponseUtils } from '../../../../shared/utils/error-response.utils';

@Injectable({
  providedIn: 'root',
})
export class RateShiftService {
  constructor(
    private http: HttpClient,
    protected partnerService: PartnerService,
  ) {}

  rateShift(placeId: number, shiftId: string, rating: number): Observable<void> {
    const url = this.getUrl(placeId, shiftId);
    const body = { rating: rating };
    return this.http.post<void>(url, body).pipe(
      catchError(error => {
        return throwError(ErrorResponseUtils.getErrorResponseError(error));
      }),
    );
  }

  private getUrl(placeId: number, shiftId: string): string {
    return `${environment.apiGWBaseUrl}/1.0/partners/${this.partnerService.getPartner().id}/places/${placeId}/shifts/${shiftId}/surveys`;
  }
}
