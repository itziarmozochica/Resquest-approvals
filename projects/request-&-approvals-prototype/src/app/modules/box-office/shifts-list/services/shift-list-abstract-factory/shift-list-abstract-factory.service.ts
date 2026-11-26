import { Injectable, Injector, Type } from '@angular/core';

import { Observable } from 'rxjs';

import { ExportTypeEnum } from '../../../../../shared/components/export-list-button/export-option.model';
import { UserService } from '../../../../../shared/services/user/user.service';
import { ShiftListQuery } from '../../../shared/models/shift-list-query';
import { GetShiftsResponse } from '../shared/shift-list.adapter';
import { ShiftListService } from './shift-list/shift-list.service';
import { UserShiftListService } from './user-shift-list/user-shift-list.service';

export interface ShiftListProvider {
  getShiftList(placeId: number, query: ShiftListQuery): Observable<GetShiftsResponse>;
  getShiftList(placeId: number, query: ShiftListQuery, fileType: ExportTypeEnum, language: string): Observable<Blob>;
}

@Injectable({
  providedIn: 'root',
})
export class ShiftListAbstractFactoryService {
  constructor(
    private userService: UserService,
    private injector: Injector,
  ) {}

  getProvider(): ShiftListProvider {
    const providerClass: Type<ShiftListProvider> = this.userService.hasPermission('can_view_shifts')
      ? ShiftListService
      : UserShiftListService;

    return this.injector.get(providerClass);
  }
}
