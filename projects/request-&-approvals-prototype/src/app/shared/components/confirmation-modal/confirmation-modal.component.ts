import { NgIf, NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';

import { IgntButtonComponent } from '@ignite/legacy/components/ignt-button/ignt-button.component';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';

import { ModalContentModule } from '../../layout/modal/modal-content.module';

@Component({
  selector: 'app-confirmation-modal',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgTemplateOutlet, IgntButtonComponent, ModalContentModule, NgIf],
  templateUrl: './confirmation-modal.component.html',
  styleUrls: ['./confirmation-modal.component.scss'],
})
export class ConfirmationModalComponent {
  @Input() title = '';
  @Input() question = '';
  @Input() explanation = '';
  @Input() acceptButtonLabel = 'OK';
  @Input() cancelButtonLabel = '';
  @Input() acceptFirst = true;
  @Input() note = '';
  @Input() messages: string[] = [];
  @Input() useWrapper = true;

  @Output() responseEmitter = new EventEmitter<boolean>();

  constructor(private modal: NgbActiveModal) {}

  close(response: boolean): void {
    this.responseEmitter.emit(response);
    this.modal.close(response);
  }
}
