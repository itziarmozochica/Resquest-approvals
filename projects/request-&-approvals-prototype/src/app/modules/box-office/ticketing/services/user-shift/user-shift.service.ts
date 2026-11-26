import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';

import { Observable, of, throwError } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';

import { environment } from '../../../../../../environments/environment';
import { PartnerService } from '../../../../../shared/services/partner/partner.service';
import { UserService } from '../../../../../shared/services/user/user.service';
import { ErrorResponseUtils } from '../../../../../shared/utils/error-response.utils';
import { GetShiftAdapter, GetShiftsApiResponseBody } from '../../../shared/adapters/shift/get-shift.adapter';
import { Shift } from '../../../shared/models/shifts.model';
import { UserShiftStorageService } from './user-shift-storage.service';

@Injectable({
  providedIn: 'root',
})
export class UserShiftService {
  constructor(
    private http: HttpClient,
    private userService: UserService,
    private partnerService: PartnerService,
    private getShiftAdapter: GetShiftAdapter,
    private userShiftStorageService: UserShiftStorageService,
  ) {}

  getOpenedShift(): Observable<Shift | null> {
    const shift: Shift | null = this.userShiftStorageService.getOpenedShift();
    if (shift != null) {
      shift.createdAt = new Date(shift.createdAt);
      return of(shift);
    }

    const path = this.getOpenedShiftUrl();
    return this.http.get<GetShiftsApiResponseBody>(path, { observe: 'response' }).pipe(
      map(result => {
        if (result.body === null) {
          throw new Error('Body is null');
        }
        return this.getShiftAdapter.fromApi(result.body);
      }),
      tap((shift: Shift) => {
        this.userShiftStorageService.setOpenedShift(shift);
      }),
      catchError(error => (error.status === 404 ? of(null) : throwError(ErrorResponseUtils.getErrorResponseError(error)))),
    );
  }

  private getOpenedShiftUrl(): string {
    const userId = this.userService.getUserId();
    const partnerId = this.partnerService.getPartner()?.id;
    return `${environment.apiGWBaseUrl}/1.0/partners/${partnerId}/users/${userId}/opened-shift`;
  }
}
