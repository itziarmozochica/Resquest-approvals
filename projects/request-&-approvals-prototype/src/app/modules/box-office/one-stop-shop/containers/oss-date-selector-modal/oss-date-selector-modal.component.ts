import { NgIf } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, inject } from '@angular/core';

import { OSSConfigStorageService } from '@fz-original/app/modules/box-office/one-stop-shop/services/oss-config-storage.service';
import { fadeAnimation } from '@fz-original/app/shared/animations/fade.animation';
import { SharedComponentsModule } from '@fz-original/app/shared/components/shared-components.module';
import { ModalContentModule } from '@fz-original/app/shared/layout/modal/modal-content.module';
import { DateAvailability } from '@fz-original/app/shared/models/session-availability/date-availability.model';
import { RegularSessionAvailabilitySummaryByDate } from '@fz-original/app/shared/models/session-availability/regular-session-availability-summary-by-date.model';
import {
  SessionAvailabilitySummaryByDate,
  SessionAvailabilitySummaryByDateType,
} from '@fz-original/app/shared/models/session-availability/session-availability-summary-by-date.model';
import { SessionSelectorType } from '@fz-original/app/shared/services/session-availability/session-selector-type.enum';
import { IgntIconComponent } from '@ignite/icon';
import { IgntButtonComponent } from '@ignite/legacy/components/ignt-button/ignt-button.component';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';
import moment from 'moment/moment';

@Component({
  animations: [fadeAnimation],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IgntButtonComponent, IgntIconComponent, ModalContentModule, NgIf, SharedComponentsModule, TranslateModule],
  selector: 'app-oss-date-selector-modal',
  standalone: true,
  styleUrls: ['./oss-date-selector-modal.component.scss'],
  templateUrl: './oss-date-selector-modal.component.html',
})
export class OssDateSelectorModalComponent {
  #changeDetectorRef = inject(ChangeDetectorRef);
  #formatTimeslot = 'YYYY-MM-DDTHH:mm:ss';
  #modal = inject(NgbActiveModal);
  #ossConfigStorageService = inject(OSSConfigStorageService);
  #selectedTimeslot: string | null = null;

  allowMultiTimeSlot = false;
  datesAvailability: DateAvailability[] = [];
  displayedSessionType: SessionAvailabilitySummaryByDateType = SessionAvailabilitySummaryByDateType.Regular;
  displayedSessionTypeChange: ((sessionType: SessionAvailabilitySummaryByDateType) => void) | null = null;
  handleShowAvailabilityFromDateChange: ((dateString: string) => void) | null = null;
  hasCloseButton = false;
  isLoadingDates = false;
  isLoadingSessions = false;
  isTimeslotSelected = false;
  loadMore: (() => void) | null = null;
  locale = '';
  regularSessionAvailabilitySummaryByDate: RegularSessionAvailabilitySummaryByDate[] = [];
  selectSession: ((session: SessionAvailabilitySummaryByDate) => void) | null = null;
  selectedAvailabilityFromDate = '';
  selectedDateAvailability: DateAvailability | null = null;
  selectedDateChange: ((date: any) => void) | null = null;
  selectedSession: RegularSessionAvailabilitySummaryByDate | null = null;
  selectedSessionChange: RegularSessionAvailabilitySummaryByDate | null = null;
  sessionSelectorType: SessionSelectorType = SessionSelectorType.BY_DATE;
  shouldShowDateSelector = false;
  showCapacity = true;
  showLoadMoreButton = false;
  ticketTypes: Map<string, number> = new Map();
  timezone = '';

  changeSelectedSession(sessionSelected: SessionAvailabilitySummaryByDate): void {
    this.#selectedTimeslot = sessionSelected.selectedDatetime
      ? moment(sessionSelected.selectedDatetime.datetime).format(this.#formatTimeslot).toString()
      : null;
    this.isTimeslotSelected = true;
    this.#changeDetectorRef.markForCheck();
  }

  closeModal(selection: boolean) {
    this.#updateOssConfig();
    this.#modal.close(selection ? this.#selectedTimeslot : null);
  }

  triggerChangeDetection(): void {
    this.#changeDetectorRef.markForCheck();
  }

  #updateOssConfig(): void {
    const config = this.#ossConfigStorageService.getConfiguration();
    if (config) {
      config.customTabDatetime = this.#selectedTimeslot ?? undefined;
      this.#ossConfigStorageService.setConfiguration(config);
    }
  }
}
