import { Dialog } from '@angular/cdk/dialog';
import { NgFor, NgIf } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { DownloadCashRegisterReportEvent } from '@fz-original/app/core/tracking/core/events/download-cash-register-report';
import { TrackingService } from '@fz-original/app/core/tracking/tracking.service';
import { ExportTypeEnum } from '@fz-original/app/shared/components/export-list-button/export-option.model';
import { SharedComponentsModule } from '@fz-original/app/shared/components/shared-components.module';
import { IconsModule } from '@fz-original/app/shared/icons/icons.module';
import { PageTitleModule } from '@fz-original/app/shared/layout/page-title/page-title.module';
import { DownloadFilesService } from '@fz-original/app/shared/services/download/download-files.service';
import { PartnerService } from '@fz-original/app/shared/services/partner/partner.service';
import { ToastService } from '@fz-original/app/shared/services/toast/toast.service';
import { AlertSentiment } from '@ignite/legacy/components/ignt-alert/ignt-alert.component';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { BehaviorSubject, catchError, EMPTY, switchMap, tap, throwError } from 'rxjs';

import { ApprovalLegalConsentComponent } from './approval-legal-consent/approval-legal-consent.component';
import { CashRegisterReportsService } from './cash-register-reports.service';
import { FlagReportFormComponent, FlagReportFormData } from './flag-report-form/flag-report-form.component';
import { CashRegisterReport } from './models/cash-register-report.model';
import { ReportCardComponent } from './report-card/report-card.component';

@Component({
  selector: 'app-cash-register-reports',
  standalone: true,
  templateUrl: './cash-register-reports.component.html',
  styleUrls: ['./cash-register-reports.component.scss'],
  imports: [
    NgIf,
    NgFor,
    IconsModule,
    PageTitleModule,
    TranslateModule,
    ReportCardComponent,
    SharedComponentsModule,
    FlagReportFormComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CashRegisterReportsComponent implements OnInit {
  #cashRegisterReportsService = inject(CashRegisterReportsService);
  #destroyRef = inject(DestroyRef);
  #dialogService = inject(Dialog);
  #downloadFilesService = inject(DownloadFilesService);
  #fetchReportsSubject = new BehaviorSubject<void>(void 0);
  #partnerService = inject(PartnerService);
  #toastService = inject(ToastService);
  #trackingService = inject(TrackingService);
  #translateService = inject(TranslateService);

  isLoading = signal<boolean>(true);
  reports = signal<CashRegisterReport[]>([]);
  selectedReportForFlag = signal<CashRegisterReport | null>(null);
  showFlagReportSlider = signal<boolean>(false);

  approve(report: CashRegisterReport): void {
    this.#dialogService
      .open(ApprovalLegalConsentComponent)
      .closed.pipe(
        tap(approved => {
          if (approved) {
            this.#markReportAsLoading(report);
          }
        }),
        switchMap(approved => {
          if (!approved) {
            return EMPTY;
          }

          return this.#cashRegisterReportsService.approveReport(this.#partnerService.getPartner()?.id ?? 0, report.id).pipe(
            catchError((_error: unknown) => {
              this.#markReportAsLoading(report, false);
              this.#toastService.add({
                title: this.#translateService.instant('boxOffice.cashRegisterReports.error'),
                message: this.#translateService.instant('boxOffice.cashRegisterReports.approveReportErrorMessage'),
                sentiment: AlertSentiment.danger,
              });
              return throwError(() => _error);
            }),
          );
        }),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe(() => {
        this.#toastService.add({
          title: this.#translateService.instant('boxOffice.cashRegisterReports.approveReportSuccessTitle'),
          message: this.#translateService.instant('boxOffice.cashRegisterReports.approveReportSuccessMessage'),
          sentiment: AlertSentiment.positive,
        });
        this.#fetchReportsSubject.next();
      });
  }

  closeFlagReportSlider(): void {
    this.selectedReportForFlag.set(null);
    this.showFlagReportSlider.set(false);
  }

  download(reportToDownload: CashRegisterReport): void {
    if (reportToDownload.status === 'created') {
      this.#markReportAsLoading(reportToDownload);
    }

    this.#cashRegisterReportsService
      .downloadReport(this.#partnerService.getPartner()?.id ?? 0, reportToDownload.id)
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: response => {
          this.#trackingService.track(
            new DownloadCashRegisterReportEvent({
              report_id: reportToDownload.id,
              report_status: reportToDownload.status,
            }),
          );

          this.#downloadFilesService.downloadFile(response, ExportTypeEnum.PDF, `cash_register_report_${reportToDownload.id}.pdf`);

          if (reportToDownload.status === 'created') {
            this.#fetchReportsSubject.next();
            this.#toastService.add({
              title: this.#translateService.instant('boxOffice.cashRegisterReports.downloadReportSuccessTitle'),
              message: this.#translateService.instant('boxOffice.cashRegisterReports.downloadReportSuccessMessage'),
              sentiment: AlertSentiment.positive,
            });
          }
        },
        error: () => {
          this.#toastService.add({
            title: this.#translateService.instant('boxOffice.cashRegisterReports.error'),
            message: this.#translateService.instant('boxOffice.cashRegisterReports.downloadReportErrorMessage'),
            sentiment: AlertSentiment.danger,
          });

          if (reportToDownload.status === 'created') {
            this.#markReportAsLoading(reportToDownload, false);
          }
        },
      });
  }

  flagReport(reportToFlag: CashRegisterReport): void {
    this.selectedReportForFlag.set(reportToFlag);
    this.showFlagReportSlider.set(true);
  }

  ngOnInit(): void {
    this.#fetchReportsSubject
      .pipe(
        tap(() => {
          this.isLoading.set(true);
          this.reports.set([]);
        }),
        switchMap(() => this.#cashRegisterReportsService.getReports(this.#partnerService.getPartner()?.id ?? 0)),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe({
        next: reports => {
          this.isLoading.set(false);
          this.reports.set(reports);
        },
        error: () => {
          this.isLoading.set(false);
        },
      });
  }

  processFlagReportFormSubmit(data: FlagReportFormData): void {
    if (!this.selectedReportForFlag()) {
      this.closeFlagReportSlider();
      return;
    }

    this.#submitFlagReport(this.selectedReportForFlag()!, data.title, data.description);
  }

  trackReportById(_index: number, report: CashRegisterReport): CashRegisterReport['id'] {
    return report.id;
  }

  #markReportAsLoading(reportToUpdate: CashRegisterReport, loading = true): void {
    this.reports.update(reports =>
      reports.map(report => {
        if (report.id !== reportToUpdate.id) {
          return report;
        }

        return {
          ...report,
          loading,
        };
      }),
    );
  }

  #submitFlagReport(reportToFlag: CashRegisterReport, title: string, description: string): void {
    this.closeFlagReportSlider();
    this.#markReportAsLoading(reportToFlag);

    this.#cashRegisterReportsService
      .flagReport(this.#partnerService.getPartner()?.id ?? 0, reportToFlag.id, title, description)
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: () => {
          this.#toastService.add({
            title: this.#translateService.instant('boxOffice.cashRegisterReports.flagSuccessTitle'),
            message: this.#translateService.instant('boxOffice.cashRegisterReports.flagSuccessMessage'),
            sentiment: AlertSentiment.positive,
          });

          this.#fetchReportsSubject.next();
        },
        error: () => {
          this.#toastService.add({
            title: this.#translateService.instant('boxOffice.cashRegisterReports.error'),
            message: this.#translateService.instant('boxOffice.cashRegisterReports.flagError'),
            sentiment: AlertSentiment.danger,
          });

          this.#markReportAsLoading(reportToFlag, false);
        },
      });
  }
}
