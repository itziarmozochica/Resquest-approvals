import { NgIf, NgSwitch, NgSwitchCase } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, EventEmitter, inject, Input, Output, signal } from '@angular/core';

import { IconsModule } from '@fz-original/app/shared/icons/icons.module';
import { PipesModule } from '@fz-original/app/shared/pipes/pipes.module';
import { IgntTooltipDirective } from '@ignite/common';
import { IgntButtonComponent } from '@ignite/legacy/components/ignt-button/ignt-button.component';
import { IgntTagComponent } from '@ignite/legacy/components/ignt-tag/ignt-tag.component';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import moment from 'moment-timezone';

import { CashRegisterReport, CashRegisterReportStatus } from '../models/cash-register-report.model';

@Component({
  selector: 'app-report-card',
  standalone: true,
  templateUrl: './report-card.component.html',
  styleUrls: ['./report-card.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    NgIf,
    NgSwitch,
    NgSwitchCase,
    IgntTooltipDirective,
    IconsModule,
    TranslateModule,
    PipesModule,
    IgntButtonComponent,
    IgntTagComponent,
  ],
})
export class ReportCardComponent {
  #translateService = inject(TranslateService);

  /**
   * @todo migrate to `input` signal based when available
   * Optional chaining should be removed from all usages of `reportSignal()?.` once migrated to input based signal
   * given its value is required (input.required).
   */
  @Input({ required: true }) set report(val: CashRegisterReport) {
    this.reportSignal.set(val);
  }

  reportSignal = signal<CashRegisterReport | null>(null);
  readonly timezone = 'Europe/Berlin';
  countdownDays = computed<number>(() => {
    const deadlineDate = moment.tz(this.reportSignal()?.deadline, this.timezone).startOf('day');
    const todayDate = moment.tz(this.timezone).startOf('day');
    const diff = deadlineDate.diff(todayDate, 'days');
    return diff;
  });
  countdownDanger = computed<boolean>(() => this.countdownDays() < 0);
  countdownText = computed<string>(() =>
    this.countdownDays() < 0
      ? this.#translateService.instant('boxOffice.cashRegisterReports.outOfDeadline')
      : this.#translateService.instant('boxOffice.cashRegisterReports.countdownDays', { dayCount: this.countdownDays() }),
  );
  countdownWarning = computed<boolean>(() => this.countdownDays() >= 0 && this.countdownDays() <= 5);
  countdownTooltipText = computed<string>(() => {
    let keyToTranslate: string | undefined = undefined;

    if (this.countdownWarning()) {
      keyToTranslate = 'boxOffice.cashRegisterReports.countdownTooltipWarning';
    } else if (this.countdownDanger()) {
      keyToTranslate = 'boxOffice.cashRegisterReports.countdownTooltipDanger';
    }

    return keyToTranslate ? this.#translateService.instant(keyToTranslate) : undefined;
  });
  readonly dateFormat = 'd MMM yyyy';
  isDownloadEnabled = computed<boolean>(() => {
    const statusesWithoutDownload: CashRegisterReportStatus[] = ['error', 'discarded', 'to_amend'];
    return !!this.reportSignal() && !statusesWithoutDownload.includes(this.reportSignal()!.status);
  });
  location = computed<string>(() => {
    return this.reportSignal() ? `${this.reportSignal()?.location.venue.name} | ${this.reportSignal()?.location.city.name}` : '';
  });
  @Output() requestApproval = new EventEmitter<void>();
  @Output() requestDownload = new EventEmitter<void>();
  @Output() requestFlagReport = new EventEmitter<void>();
  shouldDisplayDeadline = computed<boolean>(() => {
    const statusesToHideDeadline: CashRegisterReportStatus[] = ['error', 'discarded', 'sent'];
    return !!this.reportSignal() && !statusesToHideDeadline.includes(this.reportSignal()!.status);
  });
  statusDescription = computed<string>(() => {
    let statusDescriptionToTranslate: 'validatedDescription' | 'discardedDescription' | 'changeRequestedDescription' | undefined;

    switch (this.reportSignal()?.status) {
      case 'approved':
      case 'sending':
        statusDescriptionToTranslate = 'validatedDescription';
        break;
      case 'discarded':
        statusDescriptionToTranslate = 'discardedDescription';
        break;
      case 'to_amend':
        statusDescriptionToTranslate = 'changeRequestedDescription';
        break;
      default:
        statusDescriptionToTranslate = undefined;
        break;
    }

    return statusDescriptionToTranslate
      ? `*${this.#translateService.instant(`boxOffice.cashRegisterReports.${statusDescriptionToTranslate}`)}`
      : '';
  });
  statusTagSentiment = computed<'sharp' | 'danger' | 'positive'>(() => {
    let sentiment: 'sharp' | 'danger' | 'positive';

    switch (this.reportSignal()?.status) {
      case 'error':
      case 'discarded': {
        sentiment = 'danger';
        break;
      }
      case 'sent': {
        sentiment = 'positive';
        break;
      }
      default: {
        sentiment = 'sharp';
        break;
      }
    }
    return sentiment;
  });
  statusTagVariant = computed<'outline' | 'solid'>(() => {
    return this.reportSignal()?.status === 'error' ? 'solid' : 'outline';
  });
  statusText = computed<string>(() => {
    let statusToTranslate: 'toReview' | 'toValidate' | 'validated' | 'presented' | 'error' | 'discarded' | 'changeRequested' | undefined =
      undefined;

    switch (this.reportSignal()?.status) {
      case 'created':
        statusToTranslate = 'toReview';
        break;
      case 'in_review':
        statusToTranslate = 'toValidate';
        break;
      case 'approved':
      case 'sending':
        statusToTranslate = 'validated';
        break;
      case 'sent':
        statusToTranslate = 'presented';
        break;
      case 'error':
        statusToTranslate = 'error';
        break;
      case 'discarded':
        statusToTranslate = 'discarded';
        break;
      case 'to_amend':
        statusToTranslate = 'changeRequested';
        break;
      default:
        statusToTranslate = 'toReview';
        break;
    }

    const statusTranslated = this.#translateService.instant(`boxOffice.cashRegisterReports.${statusToTranslate}`);
    return this.statusDescription() ? `${statusTranslated}*` : statusTranslated;
  });

  approve(): void {
    this.requestApproval.emit();
  }

  download(): void {
    if (this.reportSignal()?.loading) {
      return;
    }

    this.requestDownload.emit();
  }

  flagReport(): void {
    this.requestFlagReport.emit();
  }
}
