import { Component, DestroyRef, EventEmitter, inject, Input, Output, TemplateRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { IconProp } from '@fortawesome/fontawesome-svg-core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { TranslateService } from '@ngx-translate/core';
import moment from 'moment-timezone';
import { of, throwError } from 'rxjs';
import { finalize, mergeMap } from 'rxjs/operators';

import { ScreenTypeaheadInput } from '../../../../core/tracking/core/events/select-option-typeahead';
import { MessageModalComponent } from '../../../components/message-modal/message-modal.component';
import { FilterDateRange } from '../../../layout/filters/date-range/date-range.interface';
import { SelectOption } from '../../../layout/filters/select/select.interface';
import { BaseResponse } from '../../../models/base-response';
import { CapacitySummaryBySession } from '../../../models/capacity/capacity-summary-by-session.model';
import { CapacitySummaryQuery } from '../../../models/capacity/capacity-summary-query';
import { CapacitySummary } from '../../../models/capacity/capacity-summary.model';
import { SessionsByCodePool } from '../../../models/capacity/sessions-by-code-pool.model';
import { SeatingReportQuery } from '../../../models/seating-map/seating-report-query';
import { CapacityService } from '../../../services/capacity/capacity.service';
import { ErrorModalOptions, ErrorModalService } from '../../../services/error-modal/error-modal.service';
import { SeatingReportService } from '../../../services/seating-map/seating-report.service';
import { UserService } from '../../../services/user/user.service';
import { DateUtil } from '../../../utils/date.util';
import { SearchFilter } from '../../models/search-filter.model';

export interface CapacitySearchBarResult {
  filters: SearchFilter | null;
  sessions: SessionsByCodePool;
}

@Component({
  selector: 'app-capacity-search-bar',
  standalone: false,
  templateUrl: './capacity-search-bar.component.html',
  styleUrls: ['./capacity-search-bar.component.scss'],
})
export class CapacitySearchBarComponent {
  #capacityService = inject(CapacityService);
  #dateRange: FilterDateRange | null = null;
  #destroyRef = inject(DestroyRef);
  #errorModalService = inject(ErrorModalService);
  #modalService = inject(NgbModal);
  #seatingReportService = inject(SeatingReportService);
  #translateService = inject(TranslateService);
  #userService = inject(UserService);
  capacitySummary: CapacitySummary | null = null;
  dateSelected: Date | null = null;
  dateTimeList: string[] = [];
  error = false;
  filters: SearchFilter | null = null;
  filtersSelected = false;
  firstSessionSelectedWithSeating: CapacitySummaryBySession | null = null;
  @Input({ required: true }) icon!: IconProp;
  @Output() loadResult = new EventEmitter<CapacitySearchBarResult>();
  loading = false;
  @Input({ required: true }) resultTemplate!: TemplateRef<CapacitySearchBarResult>;
  @Input({ required: true }) screen!: ScreenTypeaheadInput;
  sessionsResults: SessionsByCodePool = { sessionsWithCodePool: [], sessionsWithoutCodePool: [] };
  timezone = '';

  emitSessionsResult(): void {
    this.loadResult.emit({ filters: this.filters, sessions: this.sessionsResults });
  }

  getCapacitySummary(): void {
    this.loading = true;
    this.error = false;
    this.dateTimeList = [];
    this.sessionsResults = { sessionsWithCodePool: [], sessionsWithoutCodePool: [] };
    this.updateFirstSelectedSeatingPlan();
    if (
      this.filters !== null &&
      this.filters.partner !== null &&
      this.filters.selectedPlan !== undefined &&
      this.filters.selectedPlace !== undefined
    ) {
      const params: Omit<CapacitySummaryQuery, 'timeSlotId'> = {
        partnerId: this.filters.partner.id,
        planId: this.filters.selectedPlan.id,
        placeId: this.filters.selectedPlace.id,
        startsAtFrom: this.#dateRange?.startDate ?? undefined,
        startsAtTo: this.#dateRange?.endDate ?? undefined,
        timezone: this.filters.timezone,
      };
      this.#capacityService
        .getCapacitySummary(params as CapacitySummaryQuery)
        .pipe(
          mergeMap(response => (response?.data ? of(response) : throwError(response))),
          finalize(() => (this.loading = false)),
          takeUntilDestroyed(this.#destroyRef),
        )
        .subscribe({
          next: (response: BaseResponse<CapacitySummary | null>) => {
            this.error = false;
            this.capacitySummary = response.data ?? null;
            if (response.data && response.data.capacitySummaryByDate.length > 0) {
              this.dateTimeList = response.data.capacitySummaryByDate[0].getDateTimes();
              const grouped = this.capacitySummary?.getSessionsGroupedByCodePool(
                this.capacitySummary.capacitySummaryByDate[0].date,
                this.dateTimeList[0],
              );
              this.sessionsResults = grouped
                ? { ...grouped, schedule: grouped.schedule ?? undefined }
                : { sessionsWithCodePool: [], sessionsWithoutCodePool: [] };
              this.updateFirstSelectedSeatingPlan();
            }
            this.emitSessionsResult();
          },
          error: () => {
            this.error = true;
            this.capacitySummary = null;
          },
        });
    }
  }

  getInitStartDate(selectedPlan: SelectOption): string {
    if (selectedPlan.nextSessionDate) {
      const date = moment(selectedPlan.nextSessionDate).tz('uct');
      const startDateUTCOffsetCity = date.clone().tz(this.timezone).utcOffset();
      const startFromWithOffset = date.add(+startDateUTCOffsetCity, 'minute').startOf('day');
      return startFromWithOffset.toISOString();
    }
    if (selectedPlan.lastSessionDate) {
      const date = moment(selectedPlan.lastSessionDate).tz('uct');
      const startDateUTCOffsetCity = date.clone().tz(this.timezone).utcOffset();
      const startFromWithOffset = date.add(+startDateUTCOffsetCity, 'minute').startOf('day');
      return startFromWithOffset.toISOString();
    }
    return new Date().toISOString();
  }

  isFilterSelected(filters: SearchFilter): boolean {
    return Boolean(filters.selectedCity && filters.selectedPlan && filters.selectedPlace);
  }

  isGenerateSeatingReportButtonShown(): boolean {
    return this.firstSessionSelectedWithSeating !== null;
  }

  loadNewSearch(filters: SearchFilter): void {
    this.filtersSelected = this.isFilterSelected(filters);
    this.timezone = filters.timezone;
    this.resetDateRange(filters);
    if (this.filtersSelected) {
      this.filters = filters;
      if (!this.#dateRange && this.filters.selectedPlan) {
        const initStartDate = this.getInitStartDate(this.filters.selectedPlan);
        this.#dateRange = DateUtil.getIntervalOfDaysWithTimezone(initStartDate, 1, this.timezone);
        this.dateSelected = moment(initStartDate).toDate();
      }
      this.getCapacitySummary();
    }
  }

  onClickGenerateSeatingReport(): void {
    if (
      this.filters !== null &&
      this.firstSessionSelectedWithSeating !== null &&
      this.filters.partner !== null &&
      this.filters.selectedPlan !== undefined &&
      this.filters.selectedPlace !== undefined
    ) {
      const seatingReportQuery: SeatingReportQuery = {
        partnerId: this.filters.partner.id,
        planId: this.filters.selectedPlan.id,
        placeId: this.filters.selectedPlace.id,
        sessionId: this.firstSessionSelectedWithSeating.id,
        emailAddress: this.#userService.getUserEmail(),
      };
      this.#seatingReportService
        .getSeatingReport(seatingReportQuery)
        .pipe(takeUntilDestroyed(this.#destroyRef))
        .subscribe({
          next: () => {
            const modal = this.#modalService.open(MessageModalComponent);
            modal.componentInstance.title = this.#translateService.instant(
              'sessions.sessionsPerTimeslot.generateSeatingReport.successTitle',
            );
            modal.componentInstance.messages = [
              this.#translateService.instant('sessions.sessionsPerTimeslot.generateSeatingReport.successMessage'),
              this.#userService.getUserEmail(),
            ];
          },
          error: response => this.showModalError(response?.error?.message),
        });
    }
  }

  resetDateRange(filters: SearchFilter): void {
    if (
      !this.filters ||
      this.filters.selectedCity?.id !== filters.selectedCity?.id ||
      this.filters.selectedPlan?.id !== filters.selectedPlan?.id ||
      this.filters.selectedPlace?.id !== filters.selectedPlace?.id
    ) {
      this.#dateRange = null;
    }
  }

  retrieveFirstSeatingPlan(sessions: CapacitySummaryBySession[]): CapacitySummaryBySession | null {
    for (const session of sessions) {
      if (session.hasSeating) {
        return session;
      }
    }
    return null;
  }

  selectDate(date: Date): void {
    this.dateSelected = date;
    this.#dateRange = DateUtil.getIntervalOfDaysWithTimezone(date, 1, this.timezone);
    this.getCapacitySummary();
  }

  selectDateTime(event: SelectOption): void {
    const grouped = this.capacitySummary?.getSessionsGroupedByCodePool(this.capacitySummary.capacitySummaryByDate[0].date, event.id);
    this.sessionsResults = grouped
      ? { ...grouped, schedule: grouped.schedule ?? undefined }
      : { sessionsWithCodePool: [], sessionsWithoutCodePool: [] };
    this.updateFirstSelectedSeatingPlan();
    this.loadResult.emit({ filters: this.filters, sessions: this.sessionsResults });
  }

  showModal(title: string, message: string, errorCode?: string): void {
    const options: ErrorModalOptions = {
      title,
      message,
      errorCode,
      logError: false,
    };

    this.#errorModalService.open(options);
  }

  showModalError(errorMessage?: string, titleError?: string): void {
    this.showModal(titleError ?? 'common.errorTitle', errorMessage ?? 'errors.generic');
  }

  updateFirstSelectedSeatingPlan(): void {
    if ((this.firstSessionSelectedWithSeating = this.retrieveFirstSeatingPlan(this.sessionsResults.sessionsWithoutCodePool)) == null) {
      for (const codePoolSessions of this.sessionsResults.sessionsWithCodePool) {
        if ((this.firstSessionSelectedWithSeating = this.retrieveFirstSeatingPlan(codePoolSessions.sessions)) != null) {
          return;
        }
      }
    }
  }
}
