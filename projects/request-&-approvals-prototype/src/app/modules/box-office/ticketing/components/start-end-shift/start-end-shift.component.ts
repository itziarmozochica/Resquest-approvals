import { AsyncPipe, NgIf, NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  EventEmitter,
  inject,
  Input,
  NgZone,
  OnDestroy,
  OnInit,
  Output,
  TemplateRef,
  Type,
  ViewChild,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';

import { IgntIconComponent } from '@ignite/icon';
import { IgntButtonComponent } from '@ignite/legacy/components/ignt-button/ignt-button.component';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { EMPTY, merge, Observable, of, ReplaySubject, Subject, timer } from 'rxjs';
import { catchError, filter, finalize, map, mergeMap, shareReplay, switchMap, take, takeLast, takeUntil, tap } from 'rxjs/operators';

import { EndShiftEvent } from '../../../../../core/tracking/core/events/end-shift';
import { StartShiftEvent } from '../../../../../core/tracking/core/events/start-shift';
import { StatusShiftData, StatusShiftEvent } from '../../../../../core/tracking/core/events/status-shift';
import { TrackingService } from '../../../../../core/tracking/tracking.service';
import { MessageModalComponent } from '../../../../../shared/components/message-modal/message-modal.component';
import { City } from '../../../../../shared/models/plan/city.model';
import { Plan } from '../../../../../shared/models/plan/plan.model';
import { PipesModule } from '../../../../../shared/pipes/pipes.module';
import { PartnerService } from '../../../../../shared/services/partner/partner.service';
import { PlanService } from '../../../../../shared/services/plan/plan.service';
import { CashRegister } from '../../../shared/models/cash-register';
import { OnsiteSetup } from '../../../shared/models/onsite-setup';
import { Shift, CashRegister as ShiftCashRegister, ShiftStatus } from '../../../shared/models/shifts.model';
import { CashRegistersService } from '../../../shared/services/cash-registers/cash-registers.service';
import { HuOpeningBalanceService } from '../../../shared/services/efsta-fiscal/hu-opening-balance.service';
import { HuOpeningBalanceContext } from '../../../shared/services/efsta-fiscal/models/hu-opening-balance-context.model';
import { BoxOfficePaymentMethodsService } from '../../../shared/services/payment-methods/box-office-payment-methods.service';
import { StartEndShiftService, StartShiftPartialQuery } from '../../services/start-end-shift/start-end-shift.service';
import { UserShiftService } from '../../services/user-shift/user-shift.service';
import { EndShiftModalComponent, EndShiftModalResponse } from './end-shift-modal/end-shift-modal.component';
import { StartShiftModalComponent, StartShiftModalResponse } from './start-shift-modal/start-shift-modal.component';

export interface ActiveShift {
  cashierUserName: string;
  cashRegister: string;
  cashRegisterName: string;
  complianceCheckoutEnabled?: boolean;
  currency: string;
  id: string;
  oboVenueId: number;
  onsiteSetupId: string;
  startTime: string;
  timezone: string;
  /**
   * Opening float of the shift's cash register. `undefined` when the caller could not resolve it,
   * which the cash-management skip reads as "unknown" and therefore asks.
   */
  initialAmount?: number;
}

const MINUTES_PER_HOUR = 60;
const MINUTE_IN_MILLIS = 60 * 1000;
const DURATION_UPDATE_INTERVAL_IN_MILLIS = 10000;

export enum ShiftsActionsEnum {
  end = 'end',
  start = 'start',
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AsyncPipe, IgntButtonComponent, IgntIconComponent, NgIf, NgTemplateOutlet, PipesModule, RouterLink, TranslateModule],
  selector: 'app-start-end-shift',
  standalone: true,
  styleUrls: ['./start-end-shift.component.scss'],
  templateUrl: './start-end-shift.component.html',
})
export class StartEndShiftComponent implements OnInit, OnDestroy {
  readonly #boxOfficePaymentMethodsService = inject(BoxOfficePaymentMethodsService);
  #cashRegistersService = inject(CashRegistersService);
  #changeDetectorRef = inject(ChangeDetectorRef);
  #huOpeningBalanceService = inject(HuOpeningBalanceService);
  #modalService = inject(NgbModal);
  #ngZone = inject(NgZone);
  #partnerService = inject(PartnerService);
  #planService = inject(PlanService);
  #router = inject(Router);
  #startEndShiftService = inject(StartEndShiftService);
  #trackingService = inject(TrackingService);
  #translate = inject(TranslateService);
  #userShiftsService = inject(UserShiftService);

  #cashRegisters: Array<CashRegister> = [];
  #currentOnsiteSetup: OnsiteSetup | null = null;
  #destroy$ = new Subject<void>();
  #plans$: Observable<Plan[] | null> = this.#getPlans();
  #startEndShiftRequest = new ReplaySubject<Observable<ShiftsActionsEnum>>(1);
  #updateActiveShift$ = new Subject<ActiveShift | null>();

  constructor() {
    this.#initHandleStartEndShiftRequests();
  }
  endShift(): void {
    const countryCode = this.#currentOnsiteSetup?.place?.country_iso_code_2;
    this.activeShift$
      .pipe(
        take(1),
        mergeMap(shift => {
          if (!shift) {
            return EMPTY;
          }
          if (!this.#mustCountCash(shift)) {
            return of({ finalAmount: 0, shift });
          }
          return this.#getUpdateShiftModalResponse(EndShiftModalComponent, shift.currency ?? this.currency, undefined, component => {
            component.shouldShowCashManagement = this.#mustCountCash(shift);
          }).pipe(map(response => ({ finalAmount: (response as EndShiftModalResponse)?.finalAmount ?? 0, shift })));
        }),
        mergeMap(({ finalAmount, shift }) =>
          this.#endShiftRequest(shift.id, shift.oboVenueId, finalAmount).pipe(
            tap(() => {
              this.#trackEndShift(shift, finalAmount);
              this.#sendFiscalLogout(this.#currentOnsiteSetup?.place_id ?? this.placeId ?? 0, countryCode);
            }),
            map(() => shift),
          ),
        ),
      )
      .subscribe(shift => this.#navigateToShift(shift));
  }

  @Output() activeShift = new EventEmitter<ActiveShift | null>();

  activeShift$: Observable<ActiveShift | null> = this.#updateActiveShift$.pipe(shareReplay(1));
  @Input() cityId: number | null = null;
  @Input() currency = '';
  @ViewChild('loadingEndWait', { static: true }) loadingEndWait!: TemplateRef<unknown>;
  @ViewChild('loadingStartWait', { static: true }) loadingStartWait!: TemplateRef<unknown>;
  @Input() placeId: number | null = null;
  shiftLoaded = false;

  updatedShiftDuration$: Observable<string | null> = this.#getUpdatedShiftElapsedTime(this.activeShift$);

  @Input() set forceShiftAction(requestsObservable: Observable<ShiftsActionsEnum>) {
    this.#startEndShiftRequest.next(requestsObservable);
  }

  ngOnDestroy(): void {
    this.#destroy$.next();
  }

  ngOnInit(): void {
    this.activeShift$
      .pipe(
        takeUntil(this.#destroy$),
        catchError(({ message }) => {
          this.#errorModalResponse(message);
          return of(null);
        }),
        tap(() => {
          this.shiftLoaded = true;
          this.#changeDetectorRef.markForCheck();
        }),
      )
      .subscribe((shift: ActiveShift | null) => {
        let statusShiftData: StatusShiftData;

        if (shift) {
          statusShiftData = {
            cash_register_name: shift.cashRegisterName,
            currency: shift.currency,
            start_time: shift.startTime,
            status: ShiftStatus.opened,
          };
        } else {
          statusShiftData = {
            status: ShiftStatus.closed,
          };
        }
        this.#trackingService.track(new StatusShiftEvent(statusShiftData));
        this.activeShift.emit(shift);
      });
  }

  noFilledData(): boolean {
    return !this.currency || !this.cityId || !this.placeId;
  }

  @Input() set onsiteSetup(onsiteSetup: OnsiteSetup) {
    this.#currentOnsiteSetup = onsiteSetup;
    this.#loadCashRegisters();
  }

  startShift(): void {
    const countryCode = this.#currentOnsiteSetup?.place?.country_iso_code_2;
    this.#huOpeningBalanceService
      .ensureEfrHealthy(countryCode)
      .pipe(
        switchMap(efrState =>
          this.#getUpdateShiftModalResponse(StartShiftModalComponent, this.currency, this.#cashRegisters).pipe(
            mergeMap(response => {
              if (!response) {
                return EMPTY;
              }
              const startShiftResponse = response as NonNullable<StartShiftModalResponse>;
              const query = {
                ...startShiftResponse,
                cityId: this.cityId,
                currency: this.currency,
                onsiteSetupId: this.#currentOnsiteSetup?.id ?? '',
              } as StartShiftPartialQuery;
              const partner = this.#partnerService.getPartner();
              const context: HuOpeningBalanceContext = {
                cashRegisterId: startShiftResponse.cashRegisterId,
                initialAmount: startShiftResponse.initialAmount ?? 0,
                onsiteSetupId: this.#currentOnsiteSetup?.id,
                partnerId: partner?.id ?? 0,
                partnerName: partner?.name ?? '',
                placeCountryCode: countryCode,
                placeId: this.#currentOnsiteSetup?.place_id ?? this.placeId ?? 0,
                placeName: this.#currentOnsiteSetup?.place?.name ?? '',
              };
              return this.#huOpeningBalanceService.openFiscalDayIfNeeded(efrState, context).pipe(
                switchMap(canProceed => {
                  if (!canProceed) {
                    this.#errorModalResponse('boxOffice.fiscal.openingBalanceFailed');
                    return EMPTY;
                  }
                  return this.#startShiftRequest(query).pipe(
                    filter((activeShift): activeShift is ActiveShift => activeShift !== null),
                    tap(activeShift => {
                      if (query.initialAmount !== undefined && query.initialAmount !== null) {
                        this.#trackStartShift(activeShift, query.initialAmount);
                      }
                      this.#sendFiscalLogin(context.placeId, countryCode);
                    }),
                  );
                }),
              );
            }),
          ),
        ),
      )
      .subscribe();
  }

  #endShiftRequest(shiftId: string, placeId: number, amount: number): Observable<ActiveShift | null> {
    return this.#handleUpdateShiftRequest(this.#startEndShiftService.endShift(placeId, shiftId, amount), this.loadingEndWait);
  }

  #errorModalResponse(messageKey: string): void {
    const translatedMessage = this.#translate.instant(messageKey);
    const message = translatedMessage === messageKey ? this.#translate.instant('errors.generic') : translatedMessage;

    const modal = this.#modalService.open(MessageModalComponent);
    modal.componentInstance.title = this.#translate.instant('common.errorTitle');
    modal.componentInstance.messages = [message];
  }

  #getActiveShift(shift?: Shift): Observable<ActiveShift | null> {
    const getOpenedShift = shift ? of(shift) : this.#userShiftsService.getOpenedShift();
    return getOpenedShift.pipe(
      mergeMap(shift => {
        if (!shift) {
          return of({
            shift: null,
            timezone: null,
          });
        }

        return this.#getCityTimezone(shift.cityId).pipe(map(timezone => ({ shift, timezone })));
      }),
      map(({ shift, timezone }) => {
        const shiftCashRegister = shift?.cashRegisters?.find(
          (cashRegister: ShiftCashRegister) => cashRegister.status === ShiftStatus.opened,
        );

        const cashRegisterName = this.#cashRegisters.find(
          (cashRegister: CashRegister) => cashRegister.id === shiftCashRegister?.cashRegisterId,
        )?.name;

        return (
          shift && {
            cashierUserName: shift.b2bUser.b2bUserUsername,
            cashRegister: shiftCashRegister?.cashRegisterId ?? '',
            cashRegisterName: cashRegisterName ?? '',
            complianceCheckoutEnabled: shift.complianceCheckoutEnabled,
            currency: shiftCashRegister?.currency ?? '',
            id: shift.id,
            initialAmount: shiftCashRegister?.initialAmount,
            oboVenueId: shift.oboVenueId,
            onsiteSetupId: shift.onsiteSetupId ?? '',
            startTime: shift.createdAt.toISOString(),
            timezone: timezone ?? '',
          }
        );
      }),
    );
  }

  #getCityTimezone(cityId: number): Observable<string | null> {
    return this.#plans$.pipe(
      map(plans => {
        if (!plans) return null;
        const cities = plans.map(plan => this.#getPlanCity(plan));
        return cities.find(city => city?.id === cityId)?.timeZone ?? null;
      }),
    );
  }

  #getDateIntervalDuration(start: Date, end: Date): { hours: number; minutes: number } {
    const intervalInMillis = end.getTime() - start.getTime();
    const intervalInMinutes = Math.floor(intervalInMillis / MINUTE_IN_MILLIS);

    return {
      hours: Math.floor(intervalInMinutes / MINUTES_PER_HOUR),
      minutes: intervalInMinutes % MINUTES_PER_HOUR,
    };
  }

  #getPlanCity(plan: Plan): City | null {
    const firstPlaceCityName = plan?.firstPlace?.cityName;
    const place = plan?.places?.find(place => !firstPlaceCityName || place.city?.name === firstPlaceCityName);
    return place?.city ?? null;
  }

  #getPlans(): Observable<Plan[] | null> {
    const partner = this.#partnerService.getPartner();
    if (!partner) return of(null);
    return this.#planService.getPlans(partner.id).pipe(
      map(result => result.data),
      shareReplay(1),
    );
  }

  #getShiftDuration(start: Date): string {
    const { hours, minutes } = this.#getDateIntervalDuration(start, new Date());
    return `${hours}:${minutes.toString().padStart(2, '0')}`;
  }

  #getShiftUpdatedDuration(start: Date): Observable<string> {
    return timer(0, DURATION_UPDATE_INTERVAL_IN_MILLIS).pipe(map(() => this.#getShiftDuration(start)));
  }

  #getUpdatedShiftElapsedTime(activeShift$: Observable<ActiveShift | null>): Observable<string | null> {
    return activeShift$.pipe(
      switchMap(activeShift => {
        const startTime = activeShift && new Date(activeShift.startTime);
        return startTime ? this.#getShiftUpdatedDuration(startTime) : of(null);
      }),
    );
  }

  #getUpdateShiftModalResponse<T extends EndShiftModalComponent | StartShiftModalComponent>(
    modalConstructor: Type<T>,
    currency: string,
    cashRegisters?: Array<CashRegister>,
    configureComponent?: (component: T) => void,
  ): Observable<EndShiftModalResponse | StartShiftModalResponse> {
    const modal = this.#modalService.open(modalConstructor);
    const component: T = modal.componentInstance;

    component.currency = currency;
    component.shouldShowCashManagement = this.#shouldShowCashManagement();
    if (component instanceof StartShiftModalComponent) {
      component.cashRegisters = cashRegisters;
    }
    configureComponent?.(component);
    const modalResponse = (component.response as Observable<EndShiftModalResponse | StartShiftModalResponse>).pipe(
      take(1),
      finalize(() => modal.close()),
    );
    return merge(modalResponse, modal.dismissed.pipe(map((): undefined => undefined))).pipe(take(1), filter(Boolean));
  }

  #handleUpdateShiftRequest(request: Observable<Shift | void>, waitModalTemplate: TemplateRef<unknown>): Observable<ActiveShift | null> {
    const waitModal = this.#modalService.open(waitModalTemplate, { backdrop: 'static' });
    return request.pipe(
      mergeMap((shift: Shift | void) => this.#getActiveShift(shift as Shift | undefined)),
      catchError(({ message }) => {
        this.#errorModalResponse(message);
        return EMPTY;
      }),
      finalize(() => waitModal.close()),
      tap(shift => this.#updateActiveShift$.next(shift)),
    );
  }

  #initHandleStartEndShiftRequests(): void {
    this.#startEndShiftRequest
      .pipe(
        switchMap(observable => observable),
        takeUntil(this.#destroy$),
      )
      .subscribe(action => {
        switch (action) {
          case ShiftsActionsEnum.start:
            this.startShift();
            break;
          case ShiftsActionsEnum.end:
            this.endShift();
            break;
        }
      });
  }

  #loadCashRegisters(): void {
    this.#cashRegistersService
      .getCashRegisters(this.#currentOnsiteSetup?.id)
      .pipe(
        takeLast(1),
        tap(cashRegisters => (this.#cashRegisters = cashRegisters)),
        mergeMap(() => this.#getActiveShift()),
        catchError(({ message }) => {
          this.#errorModalResponse(message);
          return of(null);
        }),
        takeUntil(this.#destroy$),
      )
      .subscribe((shift: ActiveShift | null) => this.#updateActiveShift$.next(shift));
  }

  /**
   * Whether this shift has cash to account for: the setup takes cash, or it opened with a float.
   *
   * The float half matters on its own — a setup can stop taking cash while shifts are open, and
   * that float is still real money. A float we could not read counts as cash, so we ask.
   *
   * The same value gates the skip *and* the end modal's amount field. Deciding them separately is
   * how a shift ended up being offered a modal with no field to type the float into.
   */
  #mustCountCash(shift: ActiveShift): boolean {
    return this.#shouldShowCashManagement() || shift.initialAmount !== 0;
  }

  #navigateToShift({ id, oboVenueId }: ActiveShift): void {
    this.#ngZone.run(() => {
      this.#router.navigate(['/box-office/shift/', id], { queryParams: { placeId: oboVenueId } });
    });
  }

  #sendFiscalLogin(placeId: number, countryCode: string | undefined): void {
    this.#huOpeningBalanceService.sendLogin(placeId, countryCode);
  }

  #sendFiscalLogout(placeId: number, countryCode: string | undefined): void {
    this.#huOpeningBalanceService.sendLogout(placeId, countryCode);
  }

  #shouldShowCashManagement(): boolean {
    return this.#boxOfficePaymentMethodsService.shouldShowCashManagement(this.#currentOnsiteSetup);
  }

  #startShiftRequest(query: StartShiftPartialQuery): Observable<ActiveShift | null> {
    let placeId = this.placeId;
    if (this.#currentOnsiteSetup?.place_id) {
      placeId = this.#currentOnsiteSetup.place_id;
    }

    if (!placeId) {
      console.error('placeId is required to start a shift');
      return EMPTY;
    }

    return this.#handleUpdateShiftRequest(this.#startEndShiftService.startShift(placeId, query), this.loadingStartWait);
  }

  #trackEndShift(shift: ActiveShift, finalAmount: number): void {
    this.#trackingService.track(
      new EndShiftEvent({
        cash_register_name: shift.cashRegisterName,
        currency: shift.currency,
        final_amount: finalAmount,
        user_name: shift.cashierUserName,
      }),
    );
  }

  #trackStartShift(shift: ActiveShift, initialAmount: number): void {
    this.#trackingService.track(
      new StartShiftEvent({
        cash_register_name: shift.cashRegisterName,
        currency: shift.currency,
        initial_amount: initialAmount,
        user_name: shift.cashierUserName,
      }),
    );
  }
}
