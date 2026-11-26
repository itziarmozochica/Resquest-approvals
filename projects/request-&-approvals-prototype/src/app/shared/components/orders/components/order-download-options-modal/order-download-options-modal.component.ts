import { Component, EventEmitter, Input, Output } from '@angular/core';

import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';

import { TrackingService } from '../../../../../core/tracking/tracking.service';

@Component({
  selector: 'app-message-modal',
  standalone: false,
  templateUrl: './order-download-options-modal.component.html',
  styleUrls: ['./order-download-options-modal.component.scss'],
})
export class OrderDownloadOptionsModalComponent {
  @Input() shouldIncludeBookingAnswers = false;
  @Input() shouldIncludeStaffNotes = false;

  @Output() responseEmitter = new EventEmitter<boolean>();
  @Output() shouldIncludeBookingAnswersChange = new EventEmitter<boolean>();
  @Output() shouldIncludeStaffNotesChange = new EventEmitter<boolean>();

  constructor(
    private modal: NgbActiveModal,
    private trackingService: TrackingService,
  ) {}

  close(response: boolean): void {
    this.responseEmitter.emit(response);
    this.modal.close(response);
  }

  updateIncludeBookingAnswers(value: boolean): void {
    if (value === this.shouldIncludeBookingAnswers) {
      return;
    }
    this.shouldIncludeBookingAnswers = value;
    this.shouldIncludeBookingAnswersChange.emit(this.shouldIncludeBookingAnswers);
  }

  updateIncludeStaffNotes(value: boolean): void {
    if (value === this.shouldIncludeStaffNotes) {
      return;
    }
    this.shouldIncludeStaffNotes = value;
    this.shouldIncludeStaffNotesChange.emit(this.shouldIncludeStaffNotes);
  }
}
