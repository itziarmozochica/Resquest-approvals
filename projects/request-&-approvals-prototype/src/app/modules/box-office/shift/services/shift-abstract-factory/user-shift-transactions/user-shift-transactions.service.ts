import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';

import { environment } from '../../../../../../../environments/environment';
import { PartnerService } from '../../../../../../shared/services/partner/partner.service';
import { UserService } from '../../../../../../shared/services/user/user.service';
import { ShiftTransactionsAdapter } from '../shared/shift-transactions.adapter';
import { ShiftTransactionsService } from '../shift-transactions/shift-transactions.service';

@Injectable({
  providedIn: 'root',
})
export class UserShiftTransactionsService extends ShiftTransactionsService {
  constructor(
    http: HttpClient,
    partnerService: PartnerService,
    shiftTransactionsAdapter: ShiftTransactionsAdapter,
    private userService: UserService,
  ) {
    super(http, partnerService, shiftTransactionsAdapter);
  }

  protected getShiftTransactionsUrl(placeId: number, shiftId: string): string {
    const partnerId = this.partnerService.getPartner()?.id;
    const userId = this.userService.getUser()?.id;
    return `${environment.apiGWBaseUrl}/1.0/partners/${partnerId}/places/${placeId}/users/${userId}/shifts/${shiftId}/transactions`;
  }
}
