import { AsyncPipe, DatePipe, NgIf, NgTemplateOutlet } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, inject, OnInit, signal, TemplateRef, Type, ViewChild, WritableSignal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';

import { DatadogLogService } from '@fz-original/app/core/error/datadog/logger/datadog-log.service';
import { CashRegister } from '@fz-original/app/modules/box-office/shared/models/cash-register';
import { OnsiteSetup } from '@fz-original/app/modules/box-office/shared/models/onsite-setup';
import { Shift, ShiftStatus } from '@fz-original/app/modules/box-office/shared/models/shifts.model';
import { CashRegistersService } from '@fz-original/app/modules/box-office/shared/services/cash-registers/cash-registers.service';
import { EfrHealthCheckModalService } from '@fz-original/app/modules/box-office/shared/services/efsta-fiscal/efr-health-check-modal.service';
import { HuOpeningBalanceService } from '@fz-original/app/modules/box-office/shared/services/efsta-fiscal/hu-opening-balance.service';
import { EfrHealthErrorCode } from '@fz-original/app/modules/box-office/shared/services/efsta-fiscal/models/efr-health-check.model';
import { HuOpeningBalanceContext } from '@fz-original/app/modules/box-office/shared/services/efsta-fiscal/models/hu-opening-balance-context.model';
import { OnsiteSetupsService } from '@fz-original/app/modules/box-office/shared/services/onsite-setups/onsite-setups.service';
import { BoxOfficePaymentMethodsService } from '@fz-original/app/modules/box-office/shared/services/payment-methods/box-office-payment-methods.service';
import {
  EndShiftModalComponent,
  EndShiftModalResponse,
} from '@fz-original/app/modules/box-office/ticketing/components/start-end-shift/end-shift-modal/end-shift-modal.component';
import {
  ActiveShift,
  ShiftsActionsEnum,
} from '@fz-original/app/modules/box-office/ticketing/components/start-end-shift/start-end-shift.component';
import {
  StartShiftModalComponent,
  StartShiftModalResponse,
} from '@fz-original/app/modules/box-office/ticketing/components/start-end-shift/start-shift-modal/start-shift-modal.component';
import {
  StartEndShiftService,
  StartShiftPartialQuery,
} from '@fz-original/app/modules/box-office/ticketing/services/start-end-shift/start-end-shift.service';
import { UserShiftService } from '@fz-original/app/modules/box-office/ticketing/services/user-shift/user-shift.service';
import { MessageModalComponent } from '@fz-original/app/shared/components/message-modal/message-modal.component';
import { BaseResponse } from '@fz-original/app/shared/models/base-response';
import { CityData } from '@fz-original/app/shared/models/plan/city.model';
import { OptimizelyService } from '@fz-original/app/shared/optimizely/optimizely.service';
import { CitiesService } from '@fz-original/app/shared/services/city/cities.service';
import { PartnerService } from '@fz-original/app/shared/services/partner/partner.service';
import { IgntButtonComponent } from '@ignite/common';
import { IgntIconComponent } from '@ignite/icon';
import { IgntTourAnchorDirective } from '@ignite/legacy/components/ignt-ui-tour/ignt-tour-anchor.directive';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { BehaviorSubject, defer, EMPTY, fromEvent, interval, merge, Observable, of, Subject, throwError } from 'rxjs';
import { catchError, finalize, map, mergeMap, shareReplay, switchMap, take, takeLast, tap } from 'rxjs/operators';

import { EfstaDayService } from '../../../shared/services/efsta-fiscal/efsta-day.service';
import { isFiscalDayFlowEnabled, isFiscalDayFlowUnresolved } from '../../../shared/services/efsta-fiscal/efsta-fiscal.util';
import { ComplianceLogData } from '../../../shared/services/efsta-fiscal/models/compliance-log.model';
import { OnsiteSetupsStorageService } from '../../../shared/services/onsite-setups/onsite-setups-storage.service';
import { OSSConfig } from '../../models/oss-config.model';
import { OSSConfigStorageService } from '../../services/oss-config-storage.service';
import { oneStopShopTrackingProvider } from '../../tracking/one-stop-shop.tracking-provider';
import { TrackPosShiftService } from '../../tracking/services/track-pos-shift.service';
import { OSS_SHIFT_ACTION_EVENT_KEY } from './oss-shift-action-event-key';
import { OSS_SHIFT_READY_EVENT_KEY } from './oss-shift-ready-event-key';
import { OSS_SHIFT_REQUEST_EVENT_KEY } from './oss-shift-request-event-key';
import { OSS_SHIFT_START_CANCELLED_EVENT_KEY } from './oss-shift-start-cancelled-event-key';

@Component({
  imports: [
    TranslateModule,
    RouterLink,
    NgIf,
    AsyncPipe,
    DatePipe,
    NgTemplateOutlet,
    IgntButtonComponent,
    IgntIconComponent,
    IgntTourAnchorDirective,
  ],
  providers: [...oneStopShopTrackingProvider()],
  selector: 'app-oss-shift-widget',
  standalone: true,
  styleUrls: ['./oss-shift-widget.component.scss'],
  templateUrl: './oss-shift-widget.component.html',
})
export class OssShiftWidgetComponent implements OnInit {
  readonly #boxOfficePaymentMethodsService = inject(BoxOfficePaymentMethodsService);
  #cashRegistersService = inject(CashRegistersService);
  #citiesService = inject(CitiesService);
  #cityByIdRequests = new Map<number, Observable<BaseResponse<CityData> | null>>();
  #datadogLogService = inject(DatadogLogService);
  #currentOssConfig: OSSConfig | null = null;
  #destroyRef = inject(DestroyRef);
  #efrHealthCheckModalService = inject(EfrHealthCheckModalService);
  #efstaDayService = inject(EfstaDayService);
  #huOpeningBalanceService = inject(HuOpeningBalanceService);
  #optimizelyService = inject(OptimizelyService);
  #modalService = inject(NgbModal);
  #onsiteSetupService: OnsiteSetupsService = inject(OnsiteSetupsService);
  #onsiteSetupsStorageService = inject(OnsiteSetupsStorageService);
  #ossConfigStorageService = inject(OSSConfigStorageService);
  #partnerService = inject(PartnerService);
  #router: Router = inject(Router);
  #startEndShiftService = inject(StartEndShiftService);
  #trackPosShiftService = inject(TrackPosShiftService);
  #translate = inject(TranslateService);
  #updateActiveShift$ = new Subject<ActiveShift>();
  #userShiftsService = inject(UserShiftService);

  activeShift$ = new BehaviorSubject<ActiveShift | null>(null);
  cashRegisters: CashRegister[] = [];
  cityId: WritableSignal<number> = signal<number>(0);
  currency: WritableSignal<string> = signal<string>('');
  currentTime = signal<Date>(new Date());
  protected isEndingShift = false;
  isLoading = signal<boolean>(true);
  @ViewChild('loadingEndWait', { static: true }) loadingEndWait!: TemplateRef<unknown>;
  @ViewChild('loadingStartWait', { static: true }) loadingStartWait!: TemplateRef<unknown>;
  #onsiteSetup: OnsiteSetup | null = null;
  placeId: WritableSignal<number> = signal<number>(0);
  showShiftWidget = signal<boolean>(false);

  endShift(): void {
    // `endShiftAndTrackEnded` fetches the shift before subscribing the request that opens the
    // blocking wait modal, so between the click and that modal nothing covers the button.
    if (this.isEndingShift) {
      return;
    }
    this.isEndingShift = true;

    this.activeShift$
      .pipe(
        take(1),
        mergeMap(shift => {
          if (!shift) {
            return EMPTY;
          }
          const showCloseFiscalDayOption = isFiscalDayFlowEnabled(
            this.#optimizelyService,
            this.#currentOssConfig?.onsiteSetup?.placeCountryCode,
          );
          if (this.#canCloseWithoutCounting(shift, showCloseFiscalDayOption)) {
            return of({ cashCounted: false, closeFiscalDay: false, finalAmount: 0, shift });
          }
          return this.#getUpdateShiftModalResponse(EndShiftModalComponent, shift.currency ?? this.currency(), undefined, component => {
            component.shouldShowCashManagement = this.#mustCountCash(shift);
            component.showCloseFiscalDayOption = showCloseFiscalDayOption;
          }).pipe(
            map(response => {
              const endResponse = response as EndShiftModalResponse;
              // Not every confirmed modal counted a drawer: the fiscal-day question can open it with
              // no amount field at all, and then `finalAmount` is the modal's untouched 0.
              return endResponse
                ? {
                    cashCounted: this.#mustCountCash(shift),
                    closeFiscalDay: endResponse.closeFiscalDay,
                    finalAmount: endResponse.finalAmount,
                    shift,
                  }
                : null;
            }),
          );
        }),
        mergeMap(result => {
          if (!result) {
            return EMPTY;
          }
          const { cashCounted, closeFiscalDay, finalAmount, shift } = result;
          const showCloseFiscalDayOption = isFiscalDayFlowEnabled(
            this.#optimizelyService,
            this.#currentOssConfig?.onsiteSetup?.placeCountryCode,
          );
          const countryCode = this.#currentOssConfig?.onsiteSetup?.placeCountryCode;

          const endShiftRequest$ = defer(() =>
            this.#trackPosShiftService.endShiftAndTrackEnded(
              shift,
              this.#endShiftRequest(shift.id, shift.oboVenueId, finalAmount).pipe(map(() => shift)),
              cashCounted,
            ),
          );
          const endShiftAndLogout$ = endShiftRequest$.pipe(tap(() => this.#sendFiscalLogout(this.placeId(), countryCode)));

          const logCtx: Partial<ComplianceLogData> = {
            country: countryCode,
            onsiteSetupId: this.#currentOssConfig?.onsiteSetup?.id,
            partnerId: this.#partnerService.getPartner()?.id,
          };

          if (closeFiscalDay) {
            return this.#efrHealthCheckModalService
              .ensureHealthy(countryCode, [EfrHealthErrorCode.FISCAL_DAY_NOT_OPEN, EfrHealthErrorCode.Z_REQUIRED])
              .pipe(
                switchMap(() => this.#huOpeningBalanceService.logout(this.placeId(), countryCode)),
                switchMap(() =>
                  this.#efstaDayService.closeDay(String(this.placeId()), logCtx).pipe(
                    mergeMap(response => {
                      if (!response) {
                        this.#errorModalResponse('boxOffice.fiscal.closingDayFailed');
                        return EMPTY;
                      }
                      return endShiftRequest$;
                    }),
                    catchError(() => {
                      this.#errorModalResponse('boxOffice.fiscal.closingDayFailed');
                      return EMPTY;
                    }),
                  ),
                ),
              );
          }

          if (showCloseFiscalDayOption) {
            return this.#efrHealthCheckModalService.ensureHealthy(countryCode, [EfrHealthErrorCode.Z_REQUIRED]).pipe(
              switchMap(() => this.#efstaDayService.xReport(String(this.placeId()), logCtx)),
              switchMap(xReportResponse => {
                if (!xReportResponse) {
                  this.#errorModalResponse('boxOffice.fiscal.xReportError');
                  return EMPTY;
                }
                return endShiftAndLogout$;
              }),
            );
          }

          return endShiftAndLogout$;
        }),
        tap(() => {
          this.activeShift$.next(null);
        }),
        finalize(() => (this.isEndingShift = false)),
      )
      .subscribe(shift => {
        this.#navigateToShift(shift);
      });
  }

  ngOnInit(): void {
    this.#ossConfigStorageService
      .observeConfiguration()
      .pipe(
        // `switchMap` cancels the in-flight `getOnsiteSetup` of a previous configuration whenever a
        // new one (or `null`, emitted by `removeConfiguration`) arrives, so a stale request can no
        // longer resolve and re-show the widget for the wrong partner.
        switchMap(ossConfig => {
          if (!this.#belongsToActivePartner(ossConfig)) {
            this.#resetShiftState();
            return EMPTY;
          }
          this.#currentOssConfig = ossConfig;
          this.#loadCashRegisters();
          this.cityId.set(ossConfig.onsiteSetup?.cityId ?? 0);
          this.placeId.set(ossConfig.onsiteSetup?.placeId ?? 0);
          if (ossConfig.onsiteSetup.cityId !== null) {
            this.#loadCurrencyByCityId(ossConfig.onsiteSetup.cityId);
          }
          return this.#onsiteSetupService.getOnsiteSetup(ossConfig.onsiteSetup?.id).pipe(catchError(() => EMPTY));
        }),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe(onsiteSetup => {
        this.#onsiteSetup = onsiteSetup;
        this.showShiftWidget.set(!this.#hasDisabledShiftStrategy(onsiteSetup.shift_strategy));
      });

    this.#getActiveShift()
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        error: () => {
          this.isLoading.set(false);
        },
        next: shift => {
          this.activeShift$.next(shift);
          this.isLoading.set(false);
        },
      });

    this.activeShift$.pipe(takeUntilDestroyed(this.#destroyRef)).subscribe(activeShift => {
      if (activeShift) {
        this.#notifyActiveShift(activeShift);
      }
    });

    this.#initialiseShiftWidgetEvent();
    this.#initializeCurrentTime();
  }

  startShift(): void {
    let shiftStarted = false;
    let cancellationNotified = false;
    const notifyCancelledUnlessStarted = (): void => {
      if (shiftStarted || cancellationNotified) {
        return;
      }
      cancellationNotified = true;
      this.#notifyShiftStartCancelled();
    };
    const countryCode = this.#currentOssConfig?.onsiteSetup?.placeCountryCode;
    this.#huOpeningBalanceService
      .ensureEfrHealthy(countryCode)
      .pipe(
        switchMap(efrState =>
          this.#getUpdateShiftModalResponse(StartShiftModalComponent, this.currency(), this.cashRegisters).pipe(
            mergeMap(response => {
              if (!response) {
                notifyCancelledUnlessStarted();
                return EMPTY;
              }

              const startShiftResponse = response as NonNullable<StartShiftModalResponse>;
              const query = {
                ...startShiftResponse,
                cashRegisterId: startShiftResponse.cashRegisterId ?? '',
                cityId: this.cityId(),
                currency: this.currency(),
                onsiteSetupId: this.#currentOssConfig?.onsiteSetup?.id ?? '',
              };
              const partner = this.#partnerService.getPartner();
              const context: HuOpeningBalanceContext = {
                cashRegisterId: startShiftResponse.cashRegisterId,
                initialAmount: startShiftResponse.initialAmount ?? 0,
                onsiteSetupId: this.#currentOssConfig?.onsiteSetup?.id,
                partnerId: partner?.id ?? 0,
                partnerName: partner?.name ?? '',
                placeCountryCode: countryCode,
                placeId: this.placeId(),
                placeName: this.#currentOssConfig?.onsiteSetup?.placeName ?? '',
              };
              return this.#huOpeningBalanceService.openFiscalDayIfNeeded(efrState, context).pipe(
                switchMap(canProceed => {
                  if (!canProceed) {
                    this.#errorModalResponse('boxOffice.fiscal.openingBalanceFailed');
                    notifyCancelledUnlessStarted();
                    return EMPTY;
                  }
                  return this.#startShiftRequest(query).pipe(
                    tap(activeShift => {
                      if (activeShift) {
                        shiftStarted = true;
                        this.#trackPosShiftService.trackStarted(activeShift);
                        this.activeShift$.next(activeShift);
                        this.#sendFiscalLogin(this.placeId(), countryCode);
                      }
                    }),
                    finalize(notifyCancelledUnlessStarted),
                  );
                }),
              );
            }),
          ),
        ),
        finalize(notifyCancelledUnlessStarted),
      )
      .subscribe();
  }

  #belongsToActivePartner(ossConfig: OSSConfig | null): ossConfig is OSSConfig {
    if (!ossConfig) {
      return false;
    }
    const activePartnerId = this.#partnerService.getPartner()?.id;
    return ossConfig.partnerId == null || ossConfig.partnerId === activePartnerId;
  }

  /**
   * A shift may close without an arqueo only when nothing is left to ask: no cash to count, and no
   * fiscal-day question. A fiscal flag that has not resolved yet counts as "ask".
   */
  #canCloseWithoutCounting(shift: ActiveShift, showCloseFiscalDayOption: boolean): boolean {
    const countryCode = this.#currentOssConfig?.onsiteSetup?.placeCountryCode;
    return !this.#mustCountCash(shift) && !showCloseFiscalDayOption && !isFiscalDayFlowUnresolved(this.#optimizelyService, countryCode);
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
            shift: null as Shift | null,
            timezone: null as string | null,
          });
        }

        return this.#getCityTimezone(shift.cityId).pipe(
          map(timezone => ({ shift, timezone })),
          catchError(() => of({ shift, timezone: null })),
        );
      }),
      map(({ shift, timezone }) => {
        const shiftCashRegister = shift?.cashRegisters?.find(cashRegister => cashRegister.status === ShiftStatus.opened);
        const cashRegisterName = this.cashRegisters.find(cashRegister => cashRegister.id === shiftCashRegister?.cashRegisterId)?.name;

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

  #getCityById(cityId: number): Observable<BaseResponse<CityData> | null> {
    const partner = this.#partnerService.getPartner();
    if (!partner) {
      return of(null);
    }

    const cachedRequest = this.#cityByIdRequests.get(cityId);
    if (cachedRequest) {
      return cachedRequest;
    }

    const city$ = this.#citiesService.getCityById(partner.id, cityId).pipe(
      catchError((error: unknown) => {
        // A 4xx here is the known stale-config case (e.g. a city id from another partner's
        // cached OSS setup): fall back to null and log it as a warning. Anything else (5xx,
        // network) is unexpected and rethrown so it reaches the global ErrorHandler (Sentry).
        if (error instanceof HttpErrorResponse && error.status >= 400 && error.status < 500) {
          this.#datadogLogService.logWarn('Failed to load currency by city id', {
            cityId,
            partnerId: partner.id,
            status: error.status,
          });
          return of(null);
        }
        return throwError(() => error);
      }),
      shareReplay({ bufferSize: 1, refCount: false }),
    );
    this.#cityByIdRequests.set(cityId, city$);
    return city$;
  }

  #getCityTimezone(cityId: number): Observable<string | null> {
    return this.#getCityById(cityId).pipe(map(result => result?.data?.timezone ?? null));
  }

  #getUpdateShiftModalResponse<T extends EndShiftModalComponent | StartShiftModalComponent>(
    modalConstructor: Type<T>,
    currency: string,
    cashRegisters?: CashRegister[],
    configureComponent?: (component: T) => void,
  ): Observable<unknown> {
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
    return merge(
      modalResponse,
      modal.dismissed.pipe(
        take(1),
        map((): null => null),
      ),
    );
  }

  #handleUpdateShiftRequest(request: Observable<Shift | void>, waitModalTemplate: TemplateRef<unknown>): Observable<ActiveShift | null> {
    const waitModal = this.#modalService.open(waitModalTemplate, { backdrop: 'static' });
    return request.pipe(
      mergeMap((result: Shift | void) => {
        if (result && typeof result === 'object' && 'id' in result) {
          return this.#getActiveShift(result);
        }
        return this.#getActiveShift();
      }),
      catchError(({ message }) => {
        this.#errorModalResponse(message);
        return EMPTY;
      }),
      finalize(() => waitModal.close()),
      tap(shift => {
        if (shift) {
          this.#updateActiveShift$.next(shift);
          this.activeShift$.next(shift);
        }
      }),
    );
  }

  #hasDisabledShiftStrategy(shiftStrategy: string | undefined): boolean {
    return shiftStrategy === 'disabled';
  }

  #initialiseShiftWidgetEvent() {
    fromEvent(window, OSS_SHIFT_ACTION_EVENT_KEY)
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe((event: Event) => {
        const shiftAction = (event as CustomEvent).detail.shiftAction;
        if (shiftAction === ShiftsActionsEnum.start) {
          this.startShift();
        }
        if (shiftAction === ShiftsActionsEnum.end) {
          this.endShift();
        }
      });

    fromEvent(window, OSS_SHIFT_REQUEST_EVENT_KEY)
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe(() => {
        const currentShift = this.activeShift$.value;
        if (currentShift) {
          this.#notifyActiveShift(currentShift);
        }
      });
  }

  #initializeCurrentTime(): void {
    interval(10000)
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe(() => {
        this.currentTime.set(new Date());
      });
  }

  #loadCashRegisters(): void {
    this.#cashRegistersService
      .getCashRegisters(this.#currentOssConfig?.onsiteSetup?.id)
      .pipe(
        takeLast(1),
        tap(cashRegisters => (this.cashRegisters = cashRegisters)),
        mergeMap(() => this.#getActiveShift()),
        catchError(({ message }) => {
          this.#errorModalResponse(message);
          return of(null);
        }),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe((shift: ActiveShift | null) => {
        if (!shift) {
          return;
        }
        this.#updateActiveShift$.next(shift);
        this.activeShift$.next(shift);
      });
  }

  #loadCurrencyByCityId(cityId: number): void {
    if (!this.#partnerService.getPartner()) {
      return;
    }

    this.#getCityById(cityId)
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe(result => {
        this.currency.set(result?.data?.currency ?? '');
      });
  }

  /**
   * Whether this shift has cash to account for: the setup takes cash, or it opened with a float.
   *
   * The float half matters on its own — a setup can stop taking cash while shifts are open, and
   * that float is still real money. A float we could not read counts as cash, so we ask.
   *
   * The same value gates the skip, the end modal's amount field, and the `cashCounted` we report.
   * Deciding them separately is how a shift ended up being offered a modal with no field to type
   * the float into, and how a fiscal-day close reported a drawer nobody counted as counted.
   */
  #mustCountCash(shift: ActiveShift): boolean {
    return this.#shouldShowCashManagement() || shift.initialAmount !== 0;
  }

  #navigateToShift({ id, oboVenueId }: ActiveShift): void {
    const queryParams = oboVenueId != null ? { placeId: oboVenueId } : undefined;
    this.#router.navigate(['/box-office/shift/', id], { queryParams });
  }

  #notifyShiftStartCancelled(): void {
    window.dispatchEvent(new CustomEvent(OSS_SHIFT_START_CANCELLED_EVENT_KEY));
  }

  #notifyActiveShift(activeShift: ActiveShift) {
    const ossShiftActionEvent = new CustomEvent(OSS_SHIFT_READY_EVENT_KEY, {
      detail: { activeShift },
    });
    window.dispatchEvent(ossShiftActionEvent);
  }

  #resetShiftState(): void {
    this.#cityByIdRequests.clear();
    this.#currentOssConfig = null;
    this.#onsiteSetup = null;
    this.cashRegisters = [];
    this.cityId.set(0);
    this.placeId.set(0);
    this.currency.set('');
    this.showShiftWidget.set(false);
    // Drop any shift from a previous partner so the OSS_SHIFT_REQUEST_EVENT_KEY listener does not
    // re-broadcast a stale shift once the config was rejected by the partner guard.
    this.activeShift$.next(null);
  }

  #sendFiscalLogin(placeId: number, countryCode: string | undefined): void {
    this.#huOpeningBalanceService.sendLogin(placeId, countryCode);
  }

  #sendFiscalLogout(placeId: number, countryCode: string | undefined): void {
    this.#huOpeningBalanceService.sendLogout(placeId, countryCode);
  }

  #shouldShowCashManagement(): boolean {
    return this.#boxOfficePaymentMethodsService.shouldShowCashManagement(this.#onsiteSetup);
  }

  #startShiftRequest(query: StartShiftPartialQuery): Observable<ActiveShift | null> {
    return this.#handleUpdateShiftRequest(this.#startEndShiftService.startShift(this.placeId(), query), this.loadingStartWait);
  }
}
