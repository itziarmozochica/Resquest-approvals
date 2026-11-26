import { Component, inject, Input, OnChanges } from '@angular/core';

import { FzTrackingService } from '@fz/fz-tracking/src/public-api';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { TranslateService } from '@ngx-translate/core';

import { MessageModalComponent } from '../../../../../shared/components/message-modal/message-modal.component';
import { OrderPaymentMethod } from '../../../../../shared/models/order/payment-method.enum';
import { PaymentMethodSummary, Shift } from '../../../shared/models/shifts.model';
import { ShiftAbstractFactoryService } from '../../services/shift-abstract-factory/shift-abstract-factory.service';
import { addShiftNote } from '../../tracking/events/add-shift-note.event';
import { editShiftNote } from '../../tracking/events/edit-shift-note.event';
import { buildShiftNoteData } from '../../tracking/utils/shift-note-data';
import { sumPaymentMethodSummaries } from '../../utils/payment-method-summaries-totals';

interface SalesSummaryRowContent extends Omit<PaymentMethodSummary, 'paymentMethod'> {
  paymentMethod: OrderPaymentMethod | 'totals';
}

@Component({
  selector: 'app-shift-sales-summary',
  standalone: false,
  templateUrl: './shift-sales-summary.component.html',
  styleUrls: ['./shift-sales-summary.component.scss'],
})
export class ShiftSalesSummaryComponent implements OnChanges {
  readonly #fzTracking = inject(FzTrackingService);
  salesSummaryRows: Array<SalesSummaryRowContent> = [];
  notes = '';
  editingNotes = false;
  currency = '';

  @Input() paymentSummaries!: Array<PaymentMethodSummary>;
  @Input() shift: Shift | null = null;

  constructor(
    private translateService: TranslateService,
    private modalService: NgbModal,
    private shiftProviderFactory: ShiftAbstractFactoryService,
  ) {}

  ngOnChanges(): void {
    if (this.shift && this.paymentSummaries) {
      this.currency = this.shift?.cashRegisters?.[0]?.currency || '';
      this.notes = this.shift?.comment || '';
      this.editingNotes = !!this.shift?.comment;
      this.salesSummaryRows = [...this.paymentSummaries, this.calculateTotalsRow(this.paymentSummaries)];
    }
  }

  trackByPaymentMethod(_: number, row: SalesSummaryRowContent): string {
    return row.paymentMethod;
  }

  private calculateTotalsRow(salesSummaryRows: Array<PaymentMethodSummary>): SalesSummaryRowContent {
    return { paymentMethod: 'totals', paymentMethodName: null, ...sumPaymentMethodSummaries(salesSummaryRows, this.currency) };
  }

  addNotes(): void {
    if (!this.shift) return;
    this.shiftProviderFactory
      .getShiftSummaryProvider()
      .addShiftNotes(this.shift.oboVenueId, this.shift.id, this.notes)
      .pipe()
      .subscribe(
        () => {
          this.editingNotes = false;
          this.sendShiftNoteMixpanelEvent();
          this.reloadShift();
        },
        ({ message }) => this.errorModalResponse(message),
      );
  }

  private sendShiftNoteMixpanelEvent(): void {
    if (!this.shift) return;
    const shift = this.shift;
    const eventData = buildShiftNoteData(shift, this.notes, () => this.shiftProviderFactory.getLeftOver(shift));
    this.#fzTracking.track(shift.comment ? editShiftNote(eventData) : addShiftNote(eventData));
  }

  private reloadShift(): void {
    if (!this.shift) return;
    this.shiftProviderFactory
      .getShiftSummaryProvider()
      .getShift(this.shift.oboVenueId, this.shift.id)
      .subscribe(
        (newShift: Shift) => {
          this.shift = newShift;
        },
        ({ message }) => this.errorModalResponse(message),
      );
  }

  private errorModalResponse(messageKey: string): void {
    const translatedMessage = this.translateService.instant(messageKey);
    const message = translatedMessage === messageKey ? this.translateService.instant('errors.generic') : translatedMessage;

    const modal = this.modalService.open(MessageModalComponent);
    modal.componentInstance.title = this.translateService.instant('common.errorTitle');
    modal.componentInstance.messages = [message];
  }
}
