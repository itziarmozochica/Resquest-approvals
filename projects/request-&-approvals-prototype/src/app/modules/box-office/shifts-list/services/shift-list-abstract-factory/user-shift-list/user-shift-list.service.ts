import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';

import { environment } from '../../../../../../../environments/environment';
import { PartnerService } from '../../../../../../shared/services/partner/partner.service';
import { UserService } from '../../../../../../shared/services/user/user.service';
import { ShiftListAdapter } from '../../shared/shift-list.adapter';
import { ShiftListProvider } from '../../shift-list-abstract-factory/shift-list-abstract-factory.service';
import { ShiftListService } from '../shift-list/shift-list.service';

@Injectable({
  providedIn: 'root',
})
export class UserShiftListService extends ShiftListService implements ShiftListProvider {
  constructor(
    http: HttpClient,
    shiftListAdapter: ShiftListAdapter,
    partnerService: PartnerService,
    private userService: UserService,
  ) {
    super(http, shiftListAdapter, partnerService);
  }

  protected getShiftListUrl(placeId: number): string {
    const userId = this.userService.getUserId();
    const partnerId = this.partnerService.getPartner()?.id;
    return `${environment.apiGWBaseUrl}/1.0/partners/${partnerId}/places/${placeId}/users/${userId}/shifts`;
  }
}
