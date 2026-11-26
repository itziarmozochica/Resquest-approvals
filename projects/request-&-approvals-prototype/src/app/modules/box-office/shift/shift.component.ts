import { Location } from '@angular/common';
import { Component, DestroyRef, inject, Signal, TemplateRef, ViewChild } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';

import { DatadogLogService } from '@fz-original/app/core/error/datadog/logger/datadog-log.service';
import { DownloadFilesService } from '@fz-original/app/shared/services/download/download-files.service';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { TranslateService } from '@ngx-translate/core';
import moment from 'moment-timezone';
import { merge, Observable, of } from 'rxjs';
import { catchError, filter, finalize, map, mergeMap, take, tap } from 'rxjs/operators';

import { EndShiftEvent } from '../../../core/tracking/core/events/end-shift';
import { OpenShiftDetailEvent, ShiftDetailData } from '../../../core/tracking/core/events/open-shift-detail';
import { PrintShiftDetailEvent } from '../../../core/tracking/core/events/print-shift-detail';
import { TrackingService } from '../../../core/tracking/tracking.service';
import { ExportTypeEnum } from '../../../shared/components/export-list-button/export-option.model';
import { MessageModalComponent } from '../../../shared/components/message-modal/message-modal.component';
import { SubsectionItem } from '../../../shared/layout/page-title/page-title.component';
import { OptimizelyService } from '../../../shared/optimizely/optimizely.service';
import { ErrorModalService } from '../../../shared/services/error-modal/error-modal.service';
import { Permissions } from '../../../shared/services/user/permissions';
import { UserService } from '../../../shared/services/user/user.service';
import { CashRegister } from '../shared/models/cash-register';
import { Shift, ShiftStatus } from '../shared/models/shifts.model';
import { OnsiteSetupsService } from '../shared/services/onsite-setups/onsite-setups.service';
import { PaymentFlowFeatureService } from '../shared/services/payment-flow-feature/payment-flow-feature.service';
import { BoxOfficePaymentMethodsService } from '../shared/services/payment-methods/box-office-payment-methods.service';
import {
  EndShiftModalComponent,
  EndShiftModalResponse,
} from '../ticketing/components/start-end-shift/end-shift-modal/end-shift-modal.component';
import { StartEndShiftService } from '../ticketing/services/start-end-shift/start-end-shift.service';
import { ShiftTransaction } from './models/shift-transaction';
import { ShiftAbstractFactoryService } from './services/shift-abstract-factory/shift-abstract-factory.service';

export const FILE_TYPE = ExportTypeEnum.PDF;
export const FILE_NAME = 'shift.pdf';

@Component({
  selector: 'app-shift',
  standalone: false,
  styleUrls: ['./shift.component.scss'],
  templateUrl: './shift.component.html',
})
export class ShiftComponent {
  readonly #boxOfficePaymentMethodsService = inject(BoxOfficePaymentMethodsService);
  readonly #datadogLogService = inject(DatadogLogService);
  readonly #destroyRef = inject(DestroyRef);
  #downloadFilesService = inject(DownloadFilesService);
  #errorModalService = inject(ErrorModalService);
  readonly #onsiteSetupsService = inject(OnsiteSetupsService);
  #optimizelyService: OptimizelyService = inject(OptimizelyService);
  readonly #paymentFlowFeatureService = inject(PaymentFlowFeatureService);
  #userService = inject(UserService);
  /**
   * Matches the close endpoints in partners: `userCloseShiftV1` needs `can_view_box_office`
   * and `closeShiftV1` needs `can_view_shifts`. `can_view_my_shifts` is read-only.
   */
  canEndShift =
    this.#userService.hasPermission(Permissions.CAN_VIEW_BOX_OFFICE) || this.#userService.hasPermission(Permissions.CAN_VIEW_SHIFTS);
  /** Picks the summaries layout. Re-read on every Optimizely user-data push, so a late SDK answer still switches it. */
  protected readonly isNewPaymentFlowEnabled: Signal<boolean> = toSignal(
    this.#optimizelyService.observeUserData().pipe(map(() => this.#paymentFlowFeatureService.isNewPaymentFlowEnabled())),
    { initialValue: this.#paymentFlowFeatureService.isNewPaymentFlowEnabled() },
  );

  constructor(
    public location: Location,
    private route: ActivatedRoute,
    private trackingService: TrackingService,
    private translate: TranslateService,
    private shiftProviderFactory: ShiftAbstractFactoryService,
    private modalService: NgbModal,
    private startEndShiftService: StartEndShiftService,
  ) {
    const { cashRegister, shift, timezone } = this.route.snapshot.data.shiftData;
    this.shift = shift;
    this.cashRegister = cashRegister
      ? cashRegister
      : {
          id: shift?.cashRegisters[0]?.id,
          name: shift?.cashRegisters[0]?.name,
        };
    this.timezone = timezone || moment.tz.guess();
    this.shiftBreadcrumbSubsections = [
      {
        link: '/box-office/shifts-list',
        queryParams: { cityId: this.shift?.cityId, venueId: this.shift?.oboVenueId },
        title: this.translate.instant('menu.shifts'),
      },
    ];
    this.trackShiftDetailOpen();
    this.showSurvey = this.#optimizelyService.isFeatureEnabled('dual_screen_show_surveys') ?? false;
  }

  downloadTransactionsExcel(): void {
    if (this.isDownloading) {
      return;
    }

    this.isDownloading = true;
    const fileName = this.generateExcelFileName();

    this.shiftProviderFactory
      .getShiftTransactionsProvider()
      .downloadTransactions(this.shift.oboVenueId, this.shift.id, ExportTypeEnum.XLSX)
      .pipe(finalize(() => (this.isDownloading = false)))
      .subscribe(
        blob => {
          this.#downloadFilesService.downloadFile(blob, ExportTypeEnum.XLSX, fileName);
        },
        error => {
          this.#errorModalService.open({
            errorCode: error?.code || 'DOWNLOAD_TRANSACTIONS_ERROR',
            logError: true,
            message: 'errors.generic',
          });
        },
      );
  }

  activatePagination = of(true);
  cashRegister: CashRegister;
  hasMorePages = false;
  isDownloading = false;
  protected isEndingShift = false;
  isLoading = false;
  isPrinting = false;
  shift: Shift;
  shiftBreadcrumbSubsections: SubsectionItem[] = [];
  shiftStatusEnum = ShiftStatus;
  showSurvey = false;
  timezone: string;
  transactions: Array<ShiftTransaction> = [];

  @ViewChild('loadingEndWait', { static: true }) loadingEndWait!: TemplateRef<unknown>;

  get durationDisplay(): string {
    if (!this.shift?.closedAt) {
      return '';
    }

    const startMoment = moment(this.shift.createdAt).tz(this.timezone);
    const endMoment = moment(this.shift.closedAt).tz(this.timezone);
    const durationInMinutes = endMoment.diff(startMoment, 'minutes');

    if (durationInMinutes > 24 * 60) {
      return '24h+';
    }

    const hours = Math.floor(durationInMinutes / 60);
    const minutes = durationInMinutes % 60;

    const hoursDisplay = hours > 0 ? `${hours}h` : '';
    const minutesDisplay = minutes > 0 ? `${minutes}m` : '';
    const separator = hoursDisplay && minutesDisplay ? ' ' : '';

    return `${hoursDisplay}${separator}${minutesDisplay}` || '0m';
  }

  endShift(): void {
    if (this.isEndingShift) {
      return;
    }
    this.isEndingShift = true;

    this.#getShouldShowCashManagement()
      .pipe(
        mergeMap(showCashManagement => (showCashManagement ? this.getCloseShiftModalResponse() : of(0))),
        mergeMap(finalAmount => this.endShiftRequest(finalAmount)),
        finalize(() => (this.isEndingShift = false)),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe(
        shift => (this.shift = shift),
        ({ message }) => this.errorModalResponse(message),
      );
  }

  get hasNoTransactions(): boolean {
    if (!this.shift?.paymentMethodSummaries) {
      return true;
    }
    return !this.shift.paymentMethodSummaries.some(summary => summary.ticketsSoldCount > 0);
  }

  print(): void {
    if (this.isPrinting) {
      return;
    }
    this.isPrinting = true;
    const { id, oboVenueId } = this.shift;
    this.shiftProviderFactory
      .getShiftSummaryProvider()
      .getShift(oboVenueId, id, FILE_TYPE, this.translate.currentLang)
      .pipe(finalize(() => (this.isPrinting = false)))
      .subscribe(
        buffer => {
          this.#downloadFilesService.downloadFile(buffer, FILE_TYPE, FILE_NAME);
          this.trackShiftDetailPrint();

          const file = this.#downloadFilesService.generateFile(buffer, FILE_TYPE);
          const fileURL = URL.createObjectURL(file);
          const printWindow = window.open(fileURL);
          if (printWindow) {
            printWindow.onload = function () {
              printWindow.print();
            };
          }
        },
        ({ message }) => this.errorModalResponse(message),
      );
  }

  #getShouldShowCashManagement(): Observable<boolean> {
    const onsiteSetupId = this.shift.onsiteSetupId;
    // Card-only is not enough on its own: a shift opened with a float must be counted even if the
    // setup stopped taking cash since. An unreadable float counts as "ask".
    const openedCashRegister = this.shift.cashRegisters?.find(cashRegister => cashRegister.status === ShiftStatus.opened);
    if (!onsiteSetupId || openedCashRegister?.initialAmount !== 0) {
      return of(true);
    }
    return this.#onsiteSetupsService.getOnsiteSetup(onsiteSetupId).pipe(
      map(onsiteSetup => this.#boxOfficePaymentMethodsService.shouldShowCashManagement(onsiteSetup)),
      catchError(() => of(true)),
    );
  }

  private endShiftRequest(amount: number): Observable<Shift> {
    const waitModal = this.modalService.open(this.loadingEndWait, { backdrop: 'static' });
    return this.startEndShiftService.endShift(this.shift.oboVenueId, this.shift.id, amount).pipe(
      finalize(() => waitModal.close()),
      tap(() => this.trackEndShift(amount)),
      mergeMap(() => this.getShift()),
    );
  }

  private errorModalResponse(messageKey: string): void {
    const translatedMessage = this.translate.instant(messageKey);
    const message = translatedMessage === messageKey ? this.translate.instant('errors.generic') : translatedMessage;

    const modal = this.modalService.open(MessageModalComponent);
    modal.componentInstance.title = this.translate.instant('common.errorTitle');
    modal.componentInstance.messages = [message];
  }

  private formatToUTC(date: string): string {
    return moment(date).tz(this.timezone).format('YYYY-MM-DDTHH:mm');
  }

  private generateExcelFileName(): string {
    const userName: string = this.shift.b2bUser.b2bUserName.replace(/\s+/g, '_').toLowerCase();

    const shiftDate: Date = this.shift.createdAt;
    const timezoneAwareDate = moment(shiftDate).tz(this.timezone);

    const dateStr: string = timezoneAwareDate.format('YYYYMMDD');
    const timeStr: string = timezoneAwareDate.format('HH.mm.ss');

    return `${userName}-${dateStr}-${timeStr}.xlsx`;
  }

  private getCloseShiftModalResponse(): Observable<number> {
    const modal = this.modalService.open(EndShiftModalComponent);
    const component: EndShiftModalComponent = modal.componentInstance;

    component.currency = this.shift.cashRegisters[0]?.currency;

    // Close the modal only when the user actually responds. Using `finalize` here would also run on
    // unsubscription, so dismissing the modal (backdrop/Esc) would complete the merged stream and
    // fire `modal.close()` on a modal ng-bootstrap is already destroying, crashing in
    // `_removeModalElements` with "Cannot read properties of null (reading 'instance')" (B2BP-278).
    const modalResponse = component.response.pipe(
      take(1),
      tap(() => modal.close()),
    );

    return merge(modalResponse, modal.dismissed.pipe(map((): undefined => undefined))).pipe(
      take(1),
      filter(
        (response): response is NonNullable<EndShiftModalResponse> =>
          response !== undefined && response !== null && 'finalAmount' in response,
      ),
      map(response => response.finalAmount),
    );
  }

  private getShift(): Observable<Shift> {
    return this.shiftProviderFactory.getShiftSummaryProvider().getShift(this.shift.oboVenueId, this.shift.id);
  }

  private getShiftDetailData(): ShiftDetailData {
    return {
      cashier_register_name: this.cashRegister.name,
      cashier_user_name: this.shift.b2bUser.b2bUserUsername,
      shift_id: this.shift.id,
      shift_start_date: this.formatToUTC(this.shift.createdAt.toISOString()),
    };
  }

  private trackEndShift(finalAmount: number): void {
    const currency = this.shift.cashRegisters[0]?.currency;
    this.trackingService.track(
      new EndShiftEvent({
        cash_register_name: this.cashRegister.name,
        currency,
        final_amount: finalAmount,
        user_name: this.shift.b2bUser.b2bUserUsername,
      }),
    );
  }

  private trackShiftDetailOpen(): void {
    try {
      this.trackingService.track(new OpenShiftDetailEvent(this.getShiftDetailData()));
    } catch (error) {
      this.#datadogLogService.logWarn('Failed to track the shift detail open event', { error: String(error), shiftId: this.shift?.id });
    }
  }

  private trackShiftDetailPrint(): void {
    this.trackingService.track(new PrintShiftDetailEvent(this.getShiftDetailData()));
  }
}
