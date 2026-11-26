import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';

import { environment } from '../../../../../../../environments/environment';
import { PartnerService } from '../../../../../../shared/services/partner/partner.service';
import { UserService } from '../../../../../../shared/services/user/user.service';
import { GetShiftAdapter } from '../../../../shared/adapters/shift/get-shift.adapter';
import { ShiftSummaryProvider } from '../shift-abstract-factory.service';
import { ShiftSummaryService } from '../shift-summary/shift-summary.service';

@Injectable({
  providedIn: 'root',
})
export class UserShiftSummaryService extends ShiftSummaryService implements ShiftSummaryProvider {
  constructor(
    http: HttpClient,
    partnerService: PartnerService,
    getShiftAdapter: GetShiftAdapter,
    private userService: UserService,
  ) {
    super(http, partnerService, getShiftAdapter);
  }

  protected getShiftUrl(placeId: number, shiftId: string): string {
    const userId = this.userService.getUser()?.id;
    const partnerId = this.partnerService.getPartner()?.id;
    return `${environment.apiGWBaseUrl}/1.0/partners/${partnerId}/places/${placeId}/users/${userId}/shifts/${shiftId}`;
  }

  protected getShiftCommentUrl(placeId: number, shiftId: string): string {
    const userId = this.userService.getUser()?.id;
    const partnerId = this.partnerService.getPartner()?.id;
    return `${environment.apiGWBaseUrl}/1.0/partners/${partnerId}/places/${placeId}/users/${userId}/shifts/${shiftId}/comment`;
  }
}
