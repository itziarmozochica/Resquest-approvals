import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';

import { Observable, throwError } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';

import { environment } from '../../../../../../environments/environment';
import { BaseResponse } from '../../../../../shared/models/base-response';
import { PartnerService } from '../../../../../shared/services/partner/partner.service';
import { UserService } from '../../../../../shared/services/user/user.service';
import { ErrorResponseUtils } from '../../../../../shared/utils/error-response.utils';
import { GetShiftAdapter, GetShiftsApiResponseBody } from '../../../shared/adapters/shift/get-shift.adapter';
import { Shift, ShiftDTO } from '../../../shared/models/shifts.model';
import { B2BUser, StartShiftQuery } from '../../models/start-shift-query';
import { UserShiftStorageService } from '../user-shift/user-shift-storage.service';
import { EndShiftAdapter } from './end-shift.adapter';
import { StartShiftAdapter } from './start-shift.adapter';

export type StartShiftPartialQuery = Pick<StartShiftQuery, 'cityId' | 'currency' | 'cashRegisterId' | 'initialAmount' | 'onsiteSetupId'>;

@Injectable({
  providedIn: 'root',
})
export class StartEndShiftService {
  constructor(
    private http: HttpClient,
    private userService: UserService,
    private partnerService: PartnerService,
    private startShiftAdapter: StartShiftAdapter,
    private endShiftAdapter: EndShiftAdapter,
    private getShiftAdapter: GetShiftAdapter,
    private userShiftStorageService: UserShiftStorageService,
  ) {}

  endShift(placeId: number, shiftId: string, finalCash: number): Observable<void> {
    return this.http.post<void>(this.getEndShiftUrl(placeId, shiftId), this.endShiftAdapter.toApi({ finalAmount: finalCash })).pipe(
      tap(() => {
        const shift: Shift | null = this.userShiftStorageService.getOpenedShift();
        if (shift != null && shift.id == shiftId) {
          this.userShiftStorageService.removeOpenedShift();
        }
      }),
      catchError(err => throwError(ErrorResponseUtils.getErrorResponseError(err))),
    );
  }

  startShift(placeId: number, query: StartShiftPartialQuery): Observable<Shift> {
    const requestBody = this.startShiftAdapter.toApi({
      ...query,
      b2bUser: this.getUserQuery(),
    });
    return this.http.post<GetShiftsApiResponseBody>(this.getStartShiftUrl(placeId), requestBody).pipe(
      map(response => this.getShiftAdapter.fromApi(response)),
      tap((shift: Shift) => this.userShiftStorageService.setOpenedShift(shift)),
      catchError(err => throwError(ErrorResponseUtils.getErrorResponseError(err))),
    );
  }

  private getEndShiftUrl(placeId: number, shiftId: string): string {
    const userId = this.userService.getUserId();
    const partnerId = this.partnerService.getPartner()?.id;
    const canCloseAllShifts = this.userService.hasPermission('can_view_shifts');
    if (canCloseAllShifts) {
      return `${environment.apiGWBaseUrl}/1.0/partners/${partnerId}/places/${placeId}/shifts/${shiftId}/close`;
    }
    return `${environment.apiGWBaseUrl}/1.0/partners/${partnerId}/places/${placeId}/users/${userId}/shifts/${shiftId}/close`;
  }

  private getStartShiftUrl(placeId: number): string {
    const userId = this.userService.getUserId();
    const partnerId = this.partnerService.getPartner()?.id;
    return `${environment.apiGWBaseUrl}/1.0/partners/${partnerId}/places/${placeId}/users/${userId}/shifts`;
  }

  private getUserQuery(): B2BUser {
    const user = this.userService.getUser();
    return {
      b2bUserEmail: user?.email ?? '',
      b2bUserName: user?.name ?? '',
      b2bUserUsername: user?.username ?? '',
    };
  }
}
