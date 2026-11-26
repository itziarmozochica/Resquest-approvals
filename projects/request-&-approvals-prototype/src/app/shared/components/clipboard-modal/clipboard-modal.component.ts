import { NgIf, NgTemplateOutlet } from '@angular/common';
import { Component, Input } from '@angular/core';

import { IgntIconComponent } from '@ignite/icon';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';
import { ClipboardModule } from 'ngx-clipboard';

import { ModalContentModule } from '../../layout/new-modal/modal-content.module';

@Component({
  selector: 'app-clipboard-modal',
  standalone: true,
  imports: [ClipboardModule, IgntIconComponent, ModalContentModule, NgIf, NgTemplateOutlet, TranslateModule],
  templateUrl: './clipboard-modal.component.html',
  styleUrls: ['./clipboard-modal.component.scss'],
})
export class ClipboardModalComponent {
  @Input() title?: string;
  @Input({ required: true }) toCopy!: string;
  @Input() acceptButtonLabel = 'OK';
  @Input() useWrapper = true;
  showSuccessMessage = false;

  constructor(private modal: NgbActiveModal) {}

  close(response: boolean): void {
    this.modal.close(response);
  }

  displaySuccessMessage(): void {
    this.showSuccessMessage = true;
    setTimeout(() => {
      this.showSuccessMessage = false;
    }, 5000);
  }
}
