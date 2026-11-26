import { NgFor } from '@angular/common';
import { Component, inject } from '@angular/core';

import { IgntButtonComponent } from '@ignite/legacy/components/ignt-button/ignt-button.component';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';

import { ModalContentModule } from '../../../../shared/layout/modal/modal-content.module';

@Component({
  selector: 'app-deposit-info-modal',
  standalone: true,
  imports: [TranslateModule, ModalContentModule, IgntButtonComponent, NgFor],
  templateUrl: './deposit-info-modal.component.html',
  styleUrls: ['./deposit-info-modal.component.scss'],
})
export class DepositInfoModalComponent {
  activeModal = inject(NgbActiveModal);

  listItems = [
    'reservation.deposit.modal.securesAvailability',
    'reservation.deposit.modal.nonRefundable',
    'reservation.deposit.modal.payRemaining',
  ];
}
