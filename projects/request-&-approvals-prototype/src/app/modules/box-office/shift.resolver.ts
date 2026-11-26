import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, Router } from '@angular/router';

import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { TranslateService } from '@ngx-translate/core';
import moment from 'moment-timezone';
import { EMPTY, Observable, of, zip } from 'rxjs';
import { catchError, finalize, map, mergeMap } from 'rxjs/operators';

import { MessageModalComponent } from '../../shared/components/message-modal/message-modal.component';
import { SpinnerService } from '../../shared/layout/spinner/spinner.service';
import { CitiesService } from '../../shared/services/city/cities.service';
import { PartnerService } from '../../shared/services/partner/partner.service';
import { CashRegister } from './shared/models/cash-register';
import { Shift } from './shared/models/shifts.model';
import { CashRegistersService } from './shared/services/cash-registers/cash-registers.service';
import { OnsiteSetupsStorageService } from './shared/services/onsite-setups/onsite-setups-storage.service';
import { ShiftAbstractFactoryService } from './shift/services/shift-abstract-factory/shift-abstract-factory.service';

export interface ShiftDetailData {
  shift: Shift;
  cashRegister: CashRegister | undefined;
  timezone: string;
}

@Injectable({
  providedIn: 'root',
})
export class ShiftResolver {
  constructor(
    private router: Router,
    private shiftProviderFactory: ShiftAbstractFactoryService,
    private partnerService: PartnerService,
    private cashRegistersService: CashRegistersService,
    private citiesService: CitiesService,
    protected spinnerService: SpinnerService,
    private onsiteSetupsStorageService: OnsiteSetupsStorageService,
    private modalService: NgbModal,
    private translateService: TranslateService,
  ) {}

  resolve(route: ActivatedRouteSnapshot): Observable<ShiftDetailData> {
    this.spinnerService.show();
    return this.getShift(route).pipe(
      mergeMap(shift => {
        const cashRegister = shift.cashRegisters?.[0];
        return zip(this.getTimezone(shift.cityId), this.getCashRegister(cashRegister?.cashRegisterId, shift.onsiteSetupId)).pipe(
          map(([timezone, cashRegister]: [string, CashRegister | undefined]) => ({ shift, cashRegister, timezone })),
        );
      }),
      catchError(error => {
        const modal = this.modalService.open(MessageModalComponent);
        modal.componentInstance.title = this.translateService.instant('common.errorTitle');
        modal.componentInstance.messages = [this.translateService.instant(error.message)];
        return EMPTY;
      }),
      finalize(() => this.spinnerService.hide()),
    );
  }

  private getTimezone(cityId: number): Observable<string> {
    const navigation = this.router.getCurrentNavigation();
    const timezone = navigation?.extras?.state?.timezone;
    return timezone ? of(timezone) : this.requestCityTimezone(cityId);
  }

  private getCashRegister(cashRegisterId: string, onsiteSetupId?: string): Observable<CashRegister | undefined> {
    const navigation = this.router.getCurrentNavigation();
    const cashRegister = navigation?.extras?.state?.cashRegister;
    return cashRegister ? of(cashRegister) : this.requestCashRegister(cashRegisterId, onsiteSetupId);
  }

  private getShift(route: ActivatedRouteSnapshot): Observable<Shift> {
    const shiftId = route.paramMap.get('shiftId') ?? '';
    const placeId = parseInt(route.queryParamMap.get('placeId') ?? '');
    return this.shiftProviderFactory.getShiftSummaryProvider().getShift(placeId, shiftId);
  }

  private requestCashRegister(cashRegisterId: string, onsiteSetupId?: string): Observable<CashRegister | undefined> {
    const currentOnsiteSetupId = onsiteSetupId ?? this.onsiteSetupsStorageService.getConfiguration()?.id;
    return this.cashRegistersService
      .getCashRegisters(currentOnsiteSetupId)
      .pipe(map(cashRegisters => cashRegisters.find(register => register.id === cashRegisterId)));
  }

  private requestCityTimezone(cityId: number): Observable<string> {
    const partnerId = this.partnerService.getActingOrganizationId();
    if (partnerId === null) {
      return of(moment.tz.guess());
    }
    return this.citiesService.getCityById(partnerId, cityId).pipe(
      map(result => result?.data?.timezone || moment.tz.guess()),
      catchError(() => of(moment.tz.guess())),
    );
  }
}
