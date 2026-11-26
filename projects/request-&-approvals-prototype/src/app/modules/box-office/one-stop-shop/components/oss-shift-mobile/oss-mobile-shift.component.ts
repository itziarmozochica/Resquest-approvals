import { AsyncPipe, NgTemplateOutlet } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  EventEmitter,
  inject,
  OnInit,
  Output,
  Signal,
  signal,
  TemplateRef,
  Type,
  ViewChild,
  WritableSignal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';

import { DatadogLogService } from '@fz-original/app/core/error/datadog/logger/datadog-log.service';
import { CashRegister } from '@fz-original/app/modules/box-office/shared/models/cash-register';
import { OboFlowTypeEnum, OnsiteSetup, ShiftStrategyEnum } from '@fz-original/app/modules/box-office/shared/models/onsite-setup';
import { Shift, ShiftStatus } from '@fz-original/app/modules/box-office/shared/models/shifts.model';
import { CashRegistersService } from '@fz-original/app/modules/box-office/shared/services/cash-registers/cash-registers.service';
import { EfrHealthCheckModalService } from '@fz-original/app/modules/box-office/shared/services/efsta-fiscal/efr-health-check-modal.service';
import { HuOpeningBalanceService } from '@fz-original/app/modules/box-office/shared/services/efsta-fiscal/hu-opening-balance.service';
import { EfrHealthErrorCode } from '@fz-original/app/modules/box-office/shared/services/efsta-fiscal/models/efr-health-check.model';
import { HuOpeningBalanceContext } from '@fz-original/app/modules/box-office/shared/services/efsta-fiscal/models/hu-opening-balance-context.model';
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
import { MobileMenuItemComponent } from '@fz-original/app/shared/layout/menu-bottom-sheet/mobile-menu-item/mobile-menu-item.component';
import { City } from '@fz-original/app/shared/models/plan/city.model';
import { Plan } from '@fz-original/app/shared/models/plan/plan.model';
import { OptimizelyService } from '@fz-original/app/shared/optimizely/optimizely.service';
import { CitiesService } from '@fz-original/app/shared/services/city/cities.service';
import { HeaderStateService } from '@fz-original/app/shared/services/header/header-state.service';
import { PartnerService } from '@fz-original/app/shared/services/partner/partner.service';
import { PlanService } from '@fz-original/app/shared/services/plan/plan.service';
import { IgntIconComponent } from '@ignite/icon';
import { IgntTagComponent } from '@ignite/legacy/components/ignt-tag/ignt-tag.component';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { BehaviorSubject, defer, EMPTY, fromEvent, merge, Observable, of, throwError, timer } from 'rxjs';
import { catchError, filter, finalize, map, mergeMap, shareReplay, startWith, switchMap, take, takeLast, tap } from 'rxjs/operators';

import { EfstaDayService } from '../../../shared/services/efsta-fiscal/efsta-day.service';
import { isFiscalDayFlowEnabled, isFiscalDayFlowUnresolved } from '../../../shared/services/efsta-fiscal/efsta-fiscal.util';
import { ComplianceLogData } from '../../../shared/services/efsta-fiscal/models/compliance-log.model';
import { OnsiteSetupsService } from '../../../shared/services/onsite-setups/onsite-setups.service';
import { BoxOfficePaymentMethodsService } from '../../../shared/services/payment-methods/box-office-payment-methods.service';
import { OSSConfig } from '../../models/oss-config.model';
import { OSSConfigStorageService } from '../../services/oss-config-storage.service';
import { oneStopShopTrackingProvider } from '../../tracking/one-stop-shop.tracking-provider';
import { TrackPosShiftService } from '../../tracking/services/track-pos-shift.service';
import { OSS_SHIFT_ACTION_EVENT_KEY } from '../oss-shift-widget/oss-shift-action-event-key';
import { OSS_SHIFT_READY_EVENT_KEY } from '../oss-shift-widget/oss-shift-ready-event-key';
import { OSS_SHIFT_REQUEST_EVENT_KEY } from '../oss-shift-widget/oss-shift-request-event-key';
import { OSS_SHIFT_START_CANCELLED_EVENT_KEY } from '../oss-shift-widget/oss-shift-start-cancelled-event-key';

interface ShiftActionEventDetail {
  shiftAction: ShiftsActionsEnum;
}

const MINUTES_PER_HOUR = 60;
const MINUTE_IN_MILLIS = 60 * 1000;
const DURATION_UPDATE_INTERVAL_IN_MILLIS = 10000;

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AsyncPipe, IgntIconComponent, IgntTagComponent, MobileMenuItemComponent, NgTemplateOutlet, TranslateModule],
  providers: [...oneStopShopTrackingProvider()],
  selector: 'app-oss-mobile-shift',
  standalone: true,
  styleUrls: ['./oss-mobile-shift.component.scss'],
  templateUrl: './oss-mobile-shift.component.html',
})
export class OssMobileShiftComponent implements OnInit {
  readonly #boxOfficePaymentMethodsService = inject(BoxOfficePaymentMethodsService);
  #cashRegistersService = inject(CashRegistersService);
  #citiesService = inject(CitiesService);
  #datadogLogService = inject(DatadogLogService);
  #currentOssConfig: OSSConfig | null = null;
  #destroyRef = inject(DestroyRef);
  #efrHealthCheckModalService = inject(EfrHealthCheckModalService);
  #efstaDayService = inject(EfstaDayService);
  #headerStateService = inject(HeaderStateService);
  #huOpeningBalanceService = inject(HuOpeningBalanceService);
  #optimizelyService = inject(OptimizelyService);
  #modalService = inject(NgbModal);
  #onsiteSetupService: OnsiteSetupsService = inject(OnsiteSetupsService);
  #ossConfigStorageService = inject(OSSConfigStorageService);
  #partnerService = inject(PartnerService);
  #plans$: Observable<Plan[]> | null = null;
  #planService = inject(PlanService);
  #router: Router = inject(Router);
  #startEndShiftService = inject(StartEndShiftService);
  #trackPosShiftService = inject(TrackPosShiftService);
  #translate = inject(TranslateService);
  #userShiftsService = inject(UserShiftService);

  activeShift$ = new BehaviorSubject<ActiveShift | null>(null);
  cashRegisters: CashRegister[] = [];
  cityId: WritableSignal<number> = signal<number>(0);
  currency: WritableSignal<string> = signal<string>('');
  hasActiveShift: WritableSignal<boolean> = signal<boolean>(false);
  isBoxOfficeRoute: WritableSignal<boolean> = signal<boolean>(false);
  protected readonly isEndingShift = signal<boolean>(false);
  isLoading: WritableSignal<boolean> = signal<boolean>(true);
  @ViewChild('loadingEndWait', { static: true }) loadingEndWait!: TemplateRef<unknown>;
  @ViewChild('loadingStartWait', { static: true }) loadingStartWait!: TemplateRef<unknown>;
  #onsiteSetup: OnsiteSetup | null = null;
  placeId: WritableSignal<number> = signal<number>(0);
  @Output() shiftDetailsClick = new EventEmitter<void>();
  @Output() shiftStarted = new EventEmitter<void>();
  shiftStrategy: WritableSignal<ShiftStrategyEnum | undefined> = signal<ShiftStrategyEnum | undefined>(undefined);
  shouldDisplayShiftControls: Signal<boolean> = computed<boolean>(() => this.hasActiveShift() || this.isBoxOfficeRoute());
  showShiftWidget = signal<boolean>(false);
  updatedShiftDuration$: Observable<string | null> = of(null);

  endShift(): void {
    // Closing the menu is not a lock: the item stays in the sheet, and `OSS_SHIFT_ACTION_EVENT_KEY`
    // reaches this method without going through the sheet at all. Meanwhile
    // `endShiftAndTrackEnded` fetches the shift before the blocking wait modal opens.
    if (this.isEndingShift()) {
      return;
    }
    this.isEndingShift.set(true);
    this.#headerStateService.closeMenu();

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
        finalize(() => this.isEndingShift.set(false)),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe(shift => {
        this.#navigateToShift(shift);
      });
  }

  getShiftTagText(): string {
    return this.shiftStrategy() === ShiftStrategyEnum.mandatory
      ? 'boxOffice.settings.actions.onsiteSetup.shiftsConfiguration.mandatory'
      : 'boxOffice.settings.actions.onsiteSetup.shiftsConfiguration.optional';
  }

  hasDisabledShiftStrategy(shiftStrategy: string | undefined): boolean {
    return shiftStrategy === ShiftStrategyEnum.disabled;
  }

  ngOnInit(): void {
    this.#setupRouteDetection();
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
          const cityId = ossConfig.onsiteSetup?.cityId;
          if (cityId !== null && cityId !== undefined) {
            this.#loadCurrencyByCityId(cityId);
          }
          return this.#onsiteSetupService.getOnsiteSetup(ossConfig.onsiteSetup?.id).pipe(catchError(() => of(null)));
        }),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe(onsiteSetup => {
        if (onsiteSetup) {
          this.shiftStrategy.set(onsiteSetup.shift_strategy);
          this.#onsiteSetup = onsiteSetup;
          const isOSSActive = onsiteSetup.obo_flow_type === OboFlowTypeEnum.one_stop_shop;
          const shiftsEnabled = !this.hasDisabledShiftStrategy(onsiteSetup.shift_strategy);
          this.showShiftWidget.set(isOSSActive && shiftsEnabled);
        }
      });

    this.#plans$ = this.#planService.getPlans(this.#partnerService.getPartner()?.id ?? 0).pipe(
      map(result => result.data ?? []),
      shareReplay({ bufferSize: 1, refCount: true }),
    );

    this.activeShift$.pipe(takeUntilDestroyed(this.#destroyRef)).subscribe(activeShift => {
      this.hasActiveShift.set(activeShift !== null);
      this.#updateShiftDuration();
      if (activeShift) {
        this.#notifyActiveShift(activeShift);
      }
    });

    this.#initialiseShiftMobileEvent();
  }

  onMobileShiftDetailsClick(): void {
    this.#headerStateService.closeMenu();
    this.shiftDetailsClick.emit();
  }

  startShift(): void {
    this.#headerStateService.closeMenu();
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
                        this.shiftStarted.emit();
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
        takeUntilDestroyed(this.#destroyRef),
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

        return shift
          ? {
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
          : null;
      }),
    );
  }

  #getCityTimezone(cityId: number): Observable<string | null> {
    if (!this.#plans$) {
      return of(null);
    }

    return this.#plans$.pipe(
      map(plans => plans?.map(plan => this.#getPlanCity(plan)) ?? []),
      map(cities => cities.find(city => city?.id === cityId)?.timeZone ?? null),
    );
  }

  #getPlanCity(plan: Plan): City | null {
    const firstPlaceCityName = plan?.firstPlace?.cityName;
    const place = plan?.places?.find(place => !firstPlaceCityName || place.city?.name === firstPlaceCityName);
    return place?.city ?? null;
  }

  #getShiftDuration(start: Date): string {
    const intervalInMillis = new Date().getTime() - start.getTime();
    const intervalInMinutes = Math.floor(intervalInMillis / MINUTE_IN_MILLIS);
    const hours = Math.floor(intervalInMinutes / MINUTES_PER_HOUR);
    const minutes = intervalInMinutes % MINUTES_PER_HOUR;
    return `${hours}:${minutes.toString().padStart(2, '0')}`;
  }

  #getShiftUpdatedDuration(start: Date): Observable<string> {
    return timer(0, DURATION_UPDATE_INTERVAL_IN_MILLIS).pipe(map(() => this.#getShiftDuration(start)));
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
    return merge(modalResponse, modal.dismissed.pipe(map((): null => null))).pipe(take(1));
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
          this.activeShift$.next(shift);
        }
      }),
    );
  }

  #initialiseShiftMobileEvent(): void {
    fromEvent(window, OSS_SHIFT_ACTION_EVENT_KEY)
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe((event: Event) => {
        const customEvent = event as CustomEvent<ShiftActionEventDetail>;
        const shiftAction = customEvent.detail?.shiftAction;
        if (!shiftAction) return;
        if (shiftAction === ShiftsActionsEnum.start) {
          this.startShift();
        } else if (shiftAction === ShiftsActionsEnum.end) {
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
        finalize(() => {
          this.isLoading.set(false);
        }),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe((shift: ActiveShift | null) => {
        if (shift) {
          this.activeShift$.next(shift);
          this.#updateShiftDuration();
        }
      });
  }

  #loadCurrencyByCityId(cityId: number): void {
    const partner = this.#partnerService.getPartner();
    if (!partner) {
      return;
    }

    this.#citiesService
      .getCityById(partner.id, cityId)
      .pipe(
        catchError((error: unknown) => {
          // A 4xx here is the known stale-config case (e.g. a city id from another partner's
          // cached OSS setup): fall back to an empty currency and log it as a warning. Anything
          // else (5xx, network) is unexpected and rethrown so it reaches the global ErrorHandler
          // (Sentry) as before.
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
        takeUntilDestroyed(this.#destroyRef),
      )
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

  #notifyActiveShift(activeShift: ActiveShift): void {
    const ossShiftActionEvent = new CustomEvent(OSS_SHIFT_READY_EVENT_KEY, {
      detail: { activeShift },
    });
    window.dispatchEvent(ossShiftActionEvent);
  }

  #resetShiftState(): void {
    this.#currentOssConfig = null;
    this.#onsiteSetup = null;
    this.cashRegisters = [];
    this.cityId.set(0);
    this.placeId.set(0);
    this.currency.set('');
    this.shiftStrategy.set(undefined);
    this.showShiftWidget.set(false);
    this.isLoading.set(false);
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

  #setupRouteDetection(): void {
    this.#router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        map(() => this.#router.url.startsWith('/box-office')),
        startWith(this.#router.url.startsWith('/box-office')),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe(value => this.isBoxOfficeRoute.set(value));
  }

  #shouldShowCashManagement(): boolean {
    return this.#boxOfficePaymentMethodsService.shouldShowCashManagement(this.#onsiteSetup);
  }

  #startShiftRequest(query: StartShiftPartialQuery): Observable<ActiveShift | null> {
    return this.#handleUpdateShiftRequest(this.#startEndShiftService.startShift(this.placeId(), query), this.loadingStartWait);
  }

  #updateShiftDuration(): void {
    this.updatedShiftDuration$ = this.activeShift$.pipe(
      switchMap(activeShift => {
        const startTime = activeShift && new Date(activeShift.startTime);
        return startTime ? this.#getShiftUpdatedDuration(startTime) : of(null);
      }),
    );
  }
}
